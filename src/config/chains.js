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
        // Flashloan providers (0% fee)
        flashloanProvider: {
            name: 'Balancer V2',
            address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            fee: 0.0
        },
        aavePool: '0x87870B27F51f6b03397141047603a6020BCff228',
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
        testnetChainId: 97,
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockExplorer: 'https://bscscan.com',
        flashloanProvider: { name: 'PancakeSwap', address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.0 },
        dexes: {
            pancakeSwapV3: { name: 'PancakeSwap V3', router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.0025 }
        },
        tokens: {
            wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
            watchlist: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c']
        }
    },
    optimism: {
        name: 'Optimism',
        chainId: 10,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://optimistic.etherscan.io',
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { uniswapV3: { name: 'Uniswap V3', router: '0xE592427A0AEce92De3Edee1F18E0157C05861564', fee: 0.003 } },
        tokens: { wrappedNative: '0x4200000000000000000000000000000000000006', watchlist: ['0x4200000000000000000000000000000000000006'] }
    },
    polygon: {
        name: 'Polygon',
        chainId: 137,
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        blockExplorer: 'https://polygonscan.com',
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { quickswap: { name: 'QuickSwap', router: '0xa5E0829CaCEd8fFDD03942104b10503958965bb5', fee: 0.003 } },
        tokens: { wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', watchlist: ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'] }
    },
    fantom: {
        name: 'Fantom',
        chainId: 250,
        nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
        blockExplorer: 'https://ftmscan.com',
        flashloanProvider: { name: 'Equalizer', address: '0x3d6c57b685cC83f4bf23768aC42847a1bcB59D50', fee: 0.0 },
        dexes: { spookySwap: { name: 'SpookySwap', router: '0xF491e7B69E4244ad4002BC14e878a34207E38c29', fee: 0.002 } },
        tokens: { wrappedNative: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', watchlist: ['0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'] }
    },
    base: {
        name: 'Base',
        chainId: 8453,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://basescan.org',
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { baseSwap: { name: 'BaseSwap', router: '0x327Df1E6de05895d2d81ED4d17963C489f4630fF', fee: 0.0025 } },
        tokens: { wrappedNative: '0x4200000000000000000000000000000000000006', watchlist: ['0x4200000000000000000000000000000000000006'] }
    },
    arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://arbiscan.io',
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { camelot: { name: 'Camelot', router: '0xc873fEcbd354f5A56E00E710B90EF42d211dd46d', fee: 0.003 } },
        tokens: { wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', watchlist: ['0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'] }
    },
    avalanche: {
        name: 'Avalanche',
        chainId: 43114,
        nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
        blockExplorer: 'https://snowtrace.io',
        balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { traderJoe: { name: 'Trader Joe', router: '0x60aE616a2a41d3E87997914a34cd565600895000', fee: 0.003 } },
        tokens: { wrappedNative: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', watchlist: ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'] }
    },
    linea: {
        name: 'Linea',
        chainId: 59144,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://lineascan.build',
        flashloanProvider: { name: 'Lynex', address: '0x327Df1E6de05895d2d81ED4d17963C489f4630fF', fee: 0.0 },
        dexes: { lynex: { name: 'Lynex', router: '0x327Df1E6de05895d2d81ED4d17963C489f4630fF', fee: 0.0025 } },
        tokens: { wrappedNative: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', watchlist: ['0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f'] }
    },
    blast: {
        name: 'Blast',
        chainId: 81457,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://blastscan.io',
        flashloanProvider: { name: 'Thruster', address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.0 },
        dexes: { thruster: { name: 'Thruster', router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.003 } },
        tokens: { wrappedNative: '0x4300000000000000000000000000000000000004', watchlist: ['0x4300000000000000000000000000000000000004'] }
    },
    scroll: {
        name: 'Scroll',
        chainId: 534352,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://scrollscan.com',
        flashloanProvider: { name: 'Ambient', address: '0x327Df1E6de05895d2d81ED4d17963C489f4630fF', fee: 0.0 },
        dexes: { ambient: { name: 'Ambient', router: '0x327Df1E6de05895d2d81ED4d17963C489f4630fF', fee: 0.0025 } },
        tokens: { wrappedNative: '0x5300000000000000000000000000000000000004', watchlist: ['0x5300000000000000000000000000000000000004'] }
    },
    mantle: {
        name: 'Mantle',
        chainId: 5000,
        nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
        blockExplorer: 'https://explorer.mantle.xyz',
        flashloanProvider: { name: 'Agni', address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.0 },
        dexes: { agni: { name: 'Agni', router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', fee: 0.0025 } },
        tokens: { wrappedNative: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000', watchlist: ['0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000'] }
    },
    monad: {
        name: 'Monad',
        chainId: 143,
        nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
        blockExplorer: 'https://monadscan.xyz',
        flashloanProvider: { name: 'MonadFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { monadSwap: { name: 'MonadSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
    },
    berachain: {
        name: 'Berachain',
        chainId: 80094,
        nativeCurrency: { name: 'BERA', symbol: 'BERA', decimals: 18 },
        blockExplorer: 'https://berascan.com',
        flashloanProvider: { name: 'Dolomite', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { bex: { name: 'BEX', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
    },
    sonic: {
        name: 'Sonic',
        chainId: 146,
        nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
        blockExplorer: 'https://sonicscan.org',
        flashloanProvider: { name: 'SonicFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { sonicSwap: { name: 'SonicSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
    },
    worldchain: {
        name: 'World Chain',
        chainId: 480,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://worldscan.org',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { worldSwap: { name: 'WorldSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x4200000000000000000000000000000000000006', watchlist: [] }
    },
    abstract: {
        name: 'Abstract',
        chainId: 2741,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://explorer.abs.xyz',
        flashloanProvider: { name: 'AbsFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { absSwap: { name: 'AbsSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
    },
    mode: {
        name: 'Mode',
        chainId: 34443,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://modescan.io',
        flashloanProvider: { name: 'Balancer', address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', fee: 0.0 },
        dexes: { modeSwap: { name: 'ModeSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x4200000000000000000000000000000000000006', watchlist: [] }
    },
    celo: {
        name: 'Celo',
        chainId: 42220,
        nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
        blockExplorer: 'https://celoscan.io',
        flashloanProvider: { name: 'Moola', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { ubeswap: { name: 'Ubeswap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x471EcE3750Da237f93B8E2997353394935240238', watchlist: [] }
    },
    unichain: {
        name: 'Unichain',
        chainId: 130,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://unichain.org',
        flashloanProvider: { name: 'UniFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { uniswapV4: { name: 'Uniswap V4', router: '0x0000000000000000000000000000000000000000', fee: 0.0005 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
    },
    ink: {
        name: 'Ink',
        chainId: 57073,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://inkscan.xyz',
        flashloanProvider: { name: 'InkFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { inkSwap: { name: 'InkSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x4200000000000000000000000000000000000006', watchlist: [] }
    },
    plasma: {
        name: 'Plasma',
        chainId: 9745,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://plasmascan.org',
        flashloanProvider: { name: 'PlasmaFlash', address: '0x0000000000000000000000000000000000000000', fee: 0.0 },
        dexes: { plasmaSwap: { name: 'PlasmaSwap', router: '0x0000000000000000000000000000000000000000', fee: 0.0025 } },
        tokens: { wrappedNative: '0x0000000000000000000000000000000000000000', watchlist: [] }
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

