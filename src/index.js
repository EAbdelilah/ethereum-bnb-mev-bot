/**
 * MEV Arbitrage Bot - Main Entry Point
 * 
 * This bot monitors multiple DEXes for arbitrage opportunities and executes
 * profitable trades using flashloans. Supports Ethereum and BNB Chain.
 */

require('dotenv').config();
const { ethers } = require('ethers');
const ArbitrageBot = require('./bot/ArbitrageBot');
const ConnectionManager = require('./services/ConnectionManager');
const logger = require('./utils/logger');
const config = require('./config/config');

/**
 * Initialize and start the arbitrage bot
 */
async function main() {
    try {
        const chainName = config.chain.name;
        const networkType = config.chain.isTestnet ? 'Testnet' : 'Mainnet';
        
        logger.info(`🚀 Starting ${chainName} MEV Arbitrage Bot...`);
        logger.info(`📡 Chain: ${chainName} ${networkType} (Chain ID: ${config.network.chainId})`);
        logger.info(`💼 Wallet: ${config.wallet.address}`);
        
        // Initialize Connection Manager
        const connManager = new ConnectionManager(config);
        const { provider, wallet } = await connManager.createProvider();
        
        // Initialize bot
        let bot = new ArbitrageBot(wallet, provider, config);
        
        // Register reconnection handler
        connManager.onReconnectCallback(async (newProvider, newWallet) => {
            logger.info('🔄 Refreshing bot state after reconnection...');
            // In a real production app, we re-initialize the bot or update its provider
            bot = new ArbitrageBot(newWallet, newProvider, config);
            await bot.start();
        });

        // Start monitoring
        await bot.start();
        
        logger.info(`✅ Bot is running and monitoring for opportunities on ${chainName}...`);
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('⏹️  Shutting down bot...');
            await bot.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            logger.info('⏹️  Shutting down bot...');
            await bot.stop();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Start the bot
main().catch((error) => {
    logger.error('❌ Unhandled error:', error);
    process.exit(1);
});

