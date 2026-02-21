/**
 * Chain Configuration for Multi-Chain Support
 * Supports Ethereum and BNB Chain (Binance Smart Chain)
 */

const CHAINS = {
    ethereum: {
        name: 'Ethereum',
        chainId: 1,
        testnetChainId: 5, // Goerli
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        wssUrl: process.env.ETHEREUM_WSS_URL,
        testnetRpcUrl: process.env.ETHEREUM_TESTNET_RPC_URL,
        testnetWssUrl: process.env.ETHEREUM_TESTNET_WSS_URL,
        blockExplorer: 'https://etherscan.io',
        // Flashloan provider
        flashloanProvider: {
            name: 'Aave V3',
            address: process.env.AAVE_LENDING_POOL || '0x87870B27F51f6b03397141047603a6020BCff228',
            fee: 0.0009 // 0.09%
        },
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        skyFlashMinter: '0x60C96F604a4441738F98931109A545385960cc72',
        zeroXExchangeProxy: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
        // DEX configuration
        dexes: {
            uniswapV2: {
                name: 'Uniswap V2',
                router: process.env.UNISWAP_V2_ROUTER || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
                factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                fee: 0.003 // 0.3%
            },
            uniswapV3: {
                name: 'Uniswap V3',
                router: process.env.UNISWAP_V3_ROUTER || '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
                factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                fee: 0.003 // 0.3%
            },
            sushiswap: {
                name: 'SushiSwap',
                router: process.env.SUSHISWAP_ROUTER || '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
                factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
                fee: 0.003 // 0.3%
            }
        },
        // Token addresses
        tokens: {
            wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
            usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            wbtc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            link: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            watchlist: [
                '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
                '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
                '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
                '0x514910771AF9Ca656af840dff83E8264EcF986CA'  // LINK
            ]
        }
    },
    bnb: {
        name: 'BNB Chain',
        chainId: 56,
        testnetChainId: 97, // BSC Testnet
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrl: process.env.BNB_RPC_URL,
        wssUrl: process.env.BNB_WSS_URL,
        testnetRpcUrl: process.env.BNB_TESTNET_RPC_URL,
        testnetWssUrl: process.env.BNB_TESTNET_WSS_URL,
        blockExplorer: 'https://bscscan.com',
        // Flashloan provider
        // Note: BNB Chain flashloan providers vary. Common options:
        // - PancakeSwap V2/V3 (has flashloan functionality)
        // - DODOV2 Protocol
        // - Other protocols
        // Users should configure the appropriate flashloan provider address
        flashloanProvider: {
            name: process.env.BNB_FLASHLOAN_PROVIDER_NAME || 'PancakeSwap',
            address: process.env.BNB_FLASHLOAN_PROVIDER || process.env.FLASHLOAN_PROVIDER || '',
            fee: parseFloat(process.env.BNB_FLASHLOAN_FEE) || 0.0009 // 0.09% (default, may vary)
        },
        // DEX configuration
        dexes: {
            pancakeSwapV2: {
                name: 'PancakeSwap V2',
                router: process.env.PANCAKESWAP_V2_ROUTER || '0x10ED43C718714eb63d5aA57B78B54704E256024E',
                factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                fee: 0.0025 // 0.25%
            },
            pancakeSwapV3: {
                name: 'PancakeSwap V3',
                router: process.env.PANCAKESWAP_V3_ROUTER || '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
                quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
                factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
                fee: 0.0025 // 0.25%
            },
            biswap: {
                name: 'Biswap',
                router: process.env.BISWAP_ROUTER || '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
                factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
                fee: 0.002 // 0.2%
            },
            apeswap: {
                name: 'ApeSwap',
                router: process.env.APESWAP_ROUTER || '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
                factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
                fee: 0.002 // 0.2%
            }
        },
        // Token addresses
        tokens: {
            wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
            usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            usdt: '0x55d398326f99059fF775485246999027B3197955',
            dai: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
            busd: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
            eth: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
            btc: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
            watchlist: [
                '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
                '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
                '0x55d398326f99059fF775485246999027B3197955', // USDT
                '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', // DAI
                '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'  // BUSD
            ]
        }
    }
};

/**
 * Get chain configuration by name or chain ID
 */
function getChainConfig(chainNameOrId) {
    // If it's a number, treat it as chain ID
    if (typeof chainNameOrId === 'number') {
        for (const [key, config] of Object.entries(CHAINS)) {
            if (config.chainId === chainNameOrId || config.testnetChainId === chainNameOrId) {
                return { ...config, key };
            }
        }
        throw new Error(`Chain ID ${chainNameOrId} not supported`);
    }
    
    // Otherwise, treat it as chain name
    const chainKey = chainNameOrId.toLowerCase();
    if (CHAINS[chainKey]) {
        return { ...CHAINS[chainKey], key: chainKey };
    }
    
    throw new Error(`Chain ${chainNameOrId} not supported. Supported chains: ${Object.keys(CHAINS).join(', ')}`);
}

/**
 * Get all supported chains
 */
function getSupportedChains() {
    return Object.keys(CHAINS);
}

/**
 * Check if chain is supported
 */
function isChainSupported(chainNameOrId) {
    try {
        getChainConfig(chainNameOrId);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    CHAINS,
    getChainConfig,
    getSupportedChains,
    isChainSupported
};

