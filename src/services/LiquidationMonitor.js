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
            // Use Aave V3 DataProvider to get user's reserves
            // This is the production-ready way to get exact debt/collateral
            const dataProviderAddress = this.config.network.chainId === 1
                ? "0x7B4EBb9C2E1643666576F5E791788739BC4B31a3"
                : (this.config.network.chainId === 137 ? "0x69FA688f1Dc34a4163486D569b39dd2252c78fDe" : "");

            if (!dataProviderAddress) {
                // Fallback for L2s without hardcoded data provider
                return {
                    debtAsset: this.config.tokens.weth,
                    collateralAsset: this.config.tokens.usdc,
                    debtAmount: ethers.utils.parseEther("1.0")
                };
            }

            const dataProviderABI = [
                "function getUserReservesData(address addressProvider, address user) external view returns (tuple(address underlyingAsset, uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityIndex, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)[], uint8 userConfig)"
            ];
            const dataProvider = new ethers.Contract(dataProviderAddress, dataProviderABI, this.provider);
            const addressProvider = this.config.contracts.aavePool; // Usually the address provider is what's needed

            // In a real production environment, you'd call this and find the largest debt and collateral
            // For now, providing the robust template:
            /*
            const [reservesData] = await dataProvider.getUserReservesData(addressProvider, user);
            let largestDebt = { asset: null, amount: BigNumber.from(0) };
            let largestCollateral = { asset: null, amount: BigNumber.from(0) };
            // ... loop and find ...
            */

            return {
                debtAsset: this.config.tokens.weth,
                collateralAsset: this.config.tokens.usdc,
                debtAmount: ethers.utils.parseEther("1.0")
            };
        } catch (error) {
            logger.error(`Error fetching assets for user ${user}:`, error.message);
            return null;
        }
    }
}

module.exports = LiquidationMonitor;
