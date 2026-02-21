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
     * Monitor Borrow events to find active users
     */
    startBorrowMonitoring() {
        const filter = {
            address: this.poolAddress,
            topics: [ethers.utils.id("Borrow(address,address,address,uint256,uint8,uint256,uint16)")]
        };

        this.provider.on(filter, (log) => {
            const user = ethers.utils.defaultAbiCoder.decode(['address'], log.topics[2])[0];
            this.users.add(user);
            logger.debug(`New borrower detected: ${user}`);
        });
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
            // In a production environment, you would use a DataProvider contract
            // or subgraph to fetch the exact assets.
            // Aave V3 DataProvider: 0x7B4EBb9C2E1643666576F5E791788739BC4B31a3 (Example)

            return {
                debtAsset: this.config.tokens.weth,
                collateralAsset: this.config.tokens.usdc,
                debtAmount: ethers.utils.parseEther("1.0") // Example: 1 ETH
            };
        } catch (error) {
            logger.error(`Error fetching assets for user ${user}:`, error);
            return null;
        }
    }
}

module.exports = LiquidationMonitor;
