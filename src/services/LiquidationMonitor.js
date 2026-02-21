/**
 * LiquidationMonitor - Monitors lending protocols for liquidation opportunities
 */

const { ethers } = require('ethers');
const logger = require('../utils/logger');

class LiquidationMonitor {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.poolAddress = config.contracts.aavePool;

        this.poolABI = [
            "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
        ];

        this.poolContract = new ethers.Contract(this.poolAddress, this.poolABI, provider);
        this.users = new Set();
    }

    /**
     * Start monitoring for liquidations
     */
    async start() {
        logger.info('🎯 LiquidationMonitor started');
        this.startBorrowMonitoring();
    }

    /**
     * Monitor multiple events to find active users on Aave
     */
    startBorrowMonitoring() {
        const events = [
            "Borrow(address,address,address,uint256,uint8,uint256,uint16)",
            "Supply(address,address,address,uint256,uint16)",
            "Withdraw(address,address,address,uint256)",
            "Repay(address,address,address,uint256,bool)"
        ];

        events.forEach(eventSig => {
            const filter = {
                address: this.poolAddress,
                topics: [ethers.utils.id(eventSig)]
            };

            this.provider.on(filter, (log) => {
                try {
                    // Extract user address (usually in topics[1] or topics[2] depending on event)
                    // For Aave V3, user is typically topics[2] for Borrow and topics[1] for others
                    const topicIndex = eventSig.startsWith("Borrow") ? 2 : 1;
                    const user = ethers.utils.defaultAbiCoder.decode(['address'], log.topics[topicIndex])[0];
                    if (user && user !== ethers.constants.AddressZero) {
                        this.users.add(user);
                        logger.debug(`Active user detected via ${eventSig.split('(')[0]}: ${user}`);
                    }
                } catch (e) {
                    // Ignore decoding errors
                }
            });
        });

        // Periodic cleanup of the users set to prevent memory leaks in long-running bots
        setInterval(() => {
            if (this.users.size > 1000) {
                logger.info(`Cleaning up user set (current size: ${this.users.size})`);
                const userArray = Array.from(this.users);
                this.users = new Set(userArray.slice(-500));
            }
        }, 3600000); // Hourly cleanup
    }

    /**
     * Scan users for liquidation opportunities
     */
    async scanForOpportunities() {
        const opportunities = [];
        const healthFactorThreshold = ethers.utils.parseEther("1.0");

        for (const user of this.users) {
            try {
                const accountData = await this.poolContract.getUserAccountData(user);
                if (accountData.healthFactor.lt(healthFactorThreshold)) {
                    logger.info(`🚨 Liquidation opportunity found for user: ${user}, Health Factor: ${ethers.utils.formatEther(accountData.healthFactor)}`);

                    const assets = await this.getUserAssets(user);
                    if (assets) {
                        opportunities.push({
                            user,
                            healthFactor: accountData.healthFactor,
                            debtAsset: assets.debtAsset,
                            collateralAsset: assets.collateralAsset,
                            debtAmount: assets.debtAmount
                        });
                    }
                }
            } catch (error) {
                logger.error(`Error checking health factor for ${user}:`, error);
            }
        }

        return opportunities;
    }

    /**
     * Helper to find best debt and collateral assets for a user
     */
    async getUserAssets(user) {
        try {
            const dataProviderAddress = this.getAaveDataProviderAddress(this.config.network.chainId);

            if (!dataProviderAddress) {
                return null;
            }

            const dataProviderABI = [
                "function getUserReservesData(address pool, address user) external view returns (tuple(address underlyingAsset, uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityIndex, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)[], uint8 userConfig)"
            ];
            const dataProvider = new ethers.Contract(dataProviderAddress, dataProviderABI, this.provider);

            // Fetch all reserves for the user
            const [reservesData] = await dataProvider.getUserReservesData(this.config.contracts.aavePool, user);

            let bestDebtAsset = null;
            let maxDebtAmount = ethers.BigNumber.from(0);
            let bestCollateralAsset = null;
            let maxCollateralValue = ethers.BigNumber.from(0);

            for (const reserve of reservesData) {
                const totalDebt = reserve.currentStableDebt.add(reserve.currentVariableDebt);
                if (totalDebt.gt(maxDebtAmount)) {
                    maxDebtAmount = totalDebt;
                    bestDebtAsset = reserve.underlyingAsset;
                }

                if (reserve.usageAsCollateralEnabled && reserve.currentATokenBalance.gt(maxCollateralValue)) {
                    maxCollateralValue = reserve.currentATokenBalance;
                    bestCollateralAsset = reserve.underlyingAsset;
                }
            }

            if (bestDebtAsset && bestCollateralAsset && maxDebtAmount.gt(0)) {
                return {
                    debtAsset: bestDebtAsset,
                    collateralAsset: bestCollateralAsset,
                    debtAmount: maxDebtAmount.div(2) // Liquidate 50% (Aave V3 max close factor)
                };
            }

            return null;
        } catch (error) {
            logger.error(`Error fetching assets for user ${user}:`, error.message);
            return null;
        }
    }

    /**
     * Get Aave V3 Data Provider address based on chain ID
     */
    getAaveDataProviderAddress(chainId) {
        const addresses = {
            1: "0x7B4EBb9C2E1643666576F5E791788739BC4B31a3",      // Ethereum
            10: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",     // Optimism
            56: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",     // BNB Chain
            137: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",    // Polygon
            42161: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",  // Arbitrum
            8453: "0x2d8A3C5677189723C4cB8873CfC9C8973Fdb3524",   // Base
            43114: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",  // Avalanche
            59144: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe",  // Linea
            534352: "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe", // Scroll
        };
        return addresses[chainId] || "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe"; // Default to common L2 DataProvider
    }
}

module.exports = LiquidationMonitor;
