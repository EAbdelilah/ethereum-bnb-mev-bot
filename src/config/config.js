/**
 * Configuration file for MEV Arbitrage Bot
 * Supports multiple chains: Ethereum and BNB Chain
 */

require('dotenv').config();
const { getChainConfig } = require('./chains');

// Get chain/network identification
const chainIdFromEnv = parseInt(process.env.CHAIN_ID);
const chainName = (process.env.CHAIN || 'ethereum').toLowerCase();
const isTestnet = process.env.NETWORK === 'testnet' || process.env.TESTNET === 'true';

// Get chain configuration
let chainConfig;
try {
    // Priority: CHAIN_ID > CHAIN (name)
    chainConfig = getChainConfig(chainIdFromEnv || chainName);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}

const finalChainId = chainIdFromEnv || (isTestnet ? chainConfig.testnetChainId : chainConfig.chainId);

// Determine RPC & WSS URLs (Priority: URL_{ID} > URL > chainConfig defaults)
const rpcUrlByEnvId = process.env[`RPC_URL_${finalChainId}`];
const rpcUrl = rpcUrlByEnvId || process.env.RPC_URL || (isTestnet ? (chainConfig.testnetRpcUrl || chainConfig.rpcUrl) : chainConfig.rpcUrl);

const wssUrlByEnvId = process.env[`WSS_URL_${finalChainId}`];
const wssUrl = wssUrlByEnvId || process.env.WSS_URL || (isTestnet ? (chainConfig.testnetWssUrl || chainConfig.wssUrl) : chainConfig.wssUrl);

// Build DEX configuration object (flattened for backward compatibility)
const dexes = {};
Object.keys(chainConfig.dexes).forEach(key => {
    const dex = chainConfig.dexes[key];
    if (dex.router) dexes[`${key}Router`] = dex.router;
    if (dex.factory) dexes[`${key}Factory`] = dex.factory;
    if (dex.quoter) dexes[`${key}Quoter`] = dex.quoter;
});

module.exports = {
    // Chain information
    chain: {
        name: chainConfig.name,
        key: chainConfig.key || chainName,
        chainId: finalChainId,
        isTestnet: isTestnet,
        nativeCurrency: chainConfig.nativeCurrency,
        blockExplorer: chainConfig.blockExplorer
    },
    
    // Network configuration
    network: {
        rpcUrl: rpcUrl,
        wssUrl: wssUrl,
        chainId: finalChainId,
        zeroXApiKey: process.env.ZEROX_API_KEY
    },
    
    // Wallet configuration
    wallet: {
        privateKey: process.env.PRIVATE_KEY,
        address: process.env.WALLET_ADDRESS
    },
    
    // Contract addresses
    contracts: {
        arbitrageContract: process.env.ARBITRAGE_CONTRACT_ADDRESS,
        flashloanProvider: process.env.FLASHLOAN_PROVIDER || chainConfig.flashloanProvider.address,
        aavePool: process.env.AAVE_POOL || chainConfig.aavePool,
        balancerVault: process.env.BALANCER_VAULT || chainConfig.balancerVault,
        skyFlashMinter: process.env.SKY_FLASH_MINTER || chainConfig.skyFlashMinter,
        zeroXExchangeProxy: process.env.ZEROX_EXCHANGE_PROXY || chainConfig.zeroXExchangeProxy,
        flashloanProviderName: chainConfig.flashloanProvider.name,
        flashloanFee: chainConfig.flashloanProvider.fee
    },
    
    // DEX configuration (flattened for backward compatibility)
    dexes: dexes,
    
    // Full DEX configuration (with metadata)
    dexesFull: chainConfig.dexes,
    
    // Token configuration
    tokens: {
        wrappedNative: chainConfig.tokens.wrappedNative,
        weth: chainConfig.tokens.wrappedNative, // Alias for backward compatibility
        wbnb: chainConfig.tokens.wrappedNative, // Alias for BNB Chain
        usdc: chainConfig.tokens.usdc,
        usdt: chainConfig.tokens.usdt,
        dai: chainConfig.tokens.dai,
        ...chainConfig.tokens, // Include all chain-specific tokens
        watchlist: chainConfig.tokens.watchlist
    },
    
    // Bot configuration
    bot: {
        minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.01,
        maxGasPrice: parseInt(process.env.MAX_GAS_PRICE) || (chainName === 'bnb' ? 5 : 100), // Lower gas for BNB Chain
        slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE) || 0.5,
        checkInterval: parseInt(process.env.CHECK_INTERVAL) || 1000,
        maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE) || (chainName === 'bnb' ? 10 : 10), // Same for both
        enableMempoolMonitoring: process.env.ENABLE_MEMPOOL_MONITORING === 'true',
        strategies: {
            mirroringRFQ: process.env.STRATEGY_MIRRORING_RFQ !== 'false',
            spatialArbitrage: process.env.STRATEGY_SPATIAL_ARBITRAGE !== 'false',
            liquidation: process.env.STRATEGY_LIQUIDATION !== 'false',
            collateralSwap: process.env.STRATEGY_COLLATERAL_SWAP !== 'false',
            triangularArb: process.env.STRATEGY_TRIANGULAR_ARB !== 'false',
            selfLiquidation: process.env.STRATEGY_SELF_LIQUIDATION !== 'false'
        },
        defaultFlashLoanProvider: process.env.DEFAULT_FLASHLOAN_PROVIDER || 'balancer',
        useFlashbots: process.env.USE_FLASHBOTS === 'true',
        flashbotsRelayUrl: process.env.FLASHBOTS_RELAY_URL || 'https://relay.flashbots.net'
    },
    
    // Telegram configuration
    telegram: {
        enabled: !!process.env.TELEGRAM_BOT_TOKEN,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
    },
    
    // Logging configuration
    logging: {
        enabled: process.env.ENABLE_LOGGING !== 'false',
        level: process.env.LOG_LEVEL || 'info'
    }
};

