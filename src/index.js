/**
 * MEV Arbitrage Bot - Main Entry Point
 * 
 * This bot monitors multiple DEXes for arbitrage opportunities and executes
 * profitable trades using flashloans. Supports Ethereum and BNB Chain.
 */

require('dotenv').config();
const { ethers } = require('ethers');
const ArbitrageBot = require('./bot/ArbitrageBot');
const logger = require('./utils/logger');
const config = require('./config/config');

/**
 * Initialize and start the arbitrage bot
 */
async function main() {
    try {
        const chainName = config.chain.name;
        const networkType = config.chain.isTestnet ? 'Testnet' : 'Mainnet';
        const nativeSymbol = config.chain.nativeCurrency.symbol;
        
        logger.info(`🚀 Starting ${chainName} MEV Arbitrage Bot...`);
        logger.info(`📡 Chain: ${chainName} ${networkType} (Chain ID: ${config.network.chainId})`);
        logger.info(`💼 Wallet: ${config.wallet.address}`);
        
        // Create provider with reconnection logic
        let provider = new ethers.providers.WebSocketProvider(config.network.wssUrl);

        const setupProvider = (wssProvider) => {
            wssProvider._websocket.on('close', async (code) => {
                logger.error(`📡 WebSocket connection closed (code: ${code}). Reconnecting...`);
                // Wait 5 seconds before reconnecting
                setTimeout(() => {
                    provider = new ethers.providers.WebSocketProvider(config.network.wssUrl);
                    setupProvider(provider);
                    // Update bot and wallet with new provider if needed
                    // In a production app, you might want to re-initialize the bot
                }, 5000);
            });

            wssProvider._websocket.on('error', (error) => {
                logger.error('📡 WebSocket error:', error);
            });
        };

        setupProvider(provider);
        
        // Create wallet
        const wallet = new ethers.Wallet(config.wallet.privateKey, provider);
        
        const balance = await wallet.getBalance();
        logger.info(`💰 Wallet Balance: ${ethers.utils.formatEther(balance)} ${nativeSymbol}`);
        
        // Initialize bot
        const bot = new ArbitrageBot(wallet, provider, config);
        
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

