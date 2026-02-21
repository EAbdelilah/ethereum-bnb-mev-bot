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
                    opportunities.push({
                        user,
                        healthFactor: accountData.healthFactor,
                        // In a real bot, we would fetch the user's debt and collateral assets
                        // For simplicity, we'll assume some defaults or use further lookups
                    });
                }
            } catch (error) {
                logger.error(`Error checking health factor for ${user}:`, error);
            }
        }

        return opportunities;
    }
}

module.exports = LiquidationMonitor;
