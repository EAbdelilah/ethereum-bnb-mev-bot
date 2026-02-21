/**
 * ArbitrageBot - Core bot implementation
 * 
 * Monitors DEX prices, calculates arbitrage opportunities,
 * and executes profitable trades using flashloans
 */

const { ethers } = require('ethers');
const BigNumber = require('bignumber.js');
const cron = require('node-cron');

const PriceFetcher = require('../services/PriceFetcher');
const LiquidationMonitor = require('../services/LiquidationMonitor');
const UniswapXMonitor = require('../services/UniswapXMonitor');
const GasEstimator = require('../services/GasEstimator');
const ProfitCalculator = require('../services/ProfitCalculator');
const TelegramNotifier = require('../services/TelegramNotifier');
const logger = require('../utils/logger');

const ARBITRAGE_ABI = require('../abis/FlashloanArbitrage.json');

const Strategy = {
    Arbitrage: 0,
    Liquidation: 1,
    UniswapXFilling: 2
};

const FlashLoanProvider = {
    Balancer: 0,
    Sky: 1
};

class ArbitrageBot {
    constructor(wallet, provider, config) {
        this.wallet = wallet;
        this.provider = provider;
        this.config = config;
        
        // Initialize services
        this.priceFetcher = new PriceFetcher(provider, config);
        this.liquidationMonitor = new LiquidationMonitor(provider, config);
        this.uniswapXMonitor = new UniswapXMonitor(provider, config);
        this.gasEstimator = new GasEstimator(provider);
        this.profitCalculator = new ProfitCalculator(config);
        this.telegramNotifier = new TelegramNotifier(config);
        
        // Initialize contract
        this.arbitrageContract = new ethers.Contract(
            config.contracts.arbitrageContract,
            ARBITRAGE_ABI,
            wallet
        );
        
        // State
        this.isRunning = false;
        this.opportunities = [];
        this.executedTrades = [];
        
        // Statistics
        this.stats = {
            totalOpportunities: 0,
            executedTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalProfit: new BigNumber(0),
            totalGasSpent: new BigNumber(0)
        };
    }
    
    /**
     * Start the bot
     */
    async start() {
        if (this.isRunning) {
            logger.warn('Bot is already running');
            return;
        }
        
        this.isRunning = true;
        logger.info('🤖 ArbitrageBot started');
        
        // Start monitoring
        this.startMonitoring();
        
        // Schedule periodic tasks
        this.schedulePeriodicTasks();
        
        // Send startup notification
        const nativeSymbol = this.config.chain.nativeCurrency.symbol;
        await this.telegramNotifier.sendMessage(
            `🚀 MEV Arbitrage Bot Started!\n` +
            `Chain: ${this.config.chain.name}\n` +
            `Network: ${this.config.network.chainId}\n` +
            `Min Profit: ${this.config.bot.minProfitThreshold} ${nativeSymbol}`
        );
    }
    
    /**
     * Stop the bot
     */
    async stop() {
        this.isRunning = false;
        logger.info('🛑 ArbitrageBot stopped');
        
        await this.telegramNotifier.sendMessage(
            '⏹️ MEV Arbitrage Bot Stopped\n' +
            this.getStatsMessage()
        );
    }
    
    /**
     * Start monitoring for arbitrage opportunities
     */
    startMonitoring() {
        logger.info('👀 Starting price monitoring...');
        
        // Monitor every N milliseconds
        setInterval(async () => {
            try {
                await this.scanForOpportunities();
            } catch (error) {
                logger.error('Error scanning for opportunities:', error);
            }
        }, this.config.bot.checkInterval);
        
        // Monitor mempool if enabled
        if (this.config.bot.enableMempoolMonitoring) {
            this.startMempoolMonitoring();
        }
    }
    
    /**
     * Scan for arbitrage, liquidation, and UniswapX opportunities
     */
    async scanForOpportunities() {
        // Strategy Selector Logic
        if (this.config.bot.strategies.arbitrage) {
            await this.scanArbitrage();
        }

        if (this.config.bot.strategies.liquidation) {
            await this.scanLiquidations();
        }

        if (this.config.bot.strategies.uniswapX) {
            await this.scanUniswapX();
        }
    }

    /**
     * Scan for arbitrage opportunities
     */
    async scanArbitrage() {
        const tokens = this.config.tokens.watchlist;
        const gasPrice = await this.gasEstimator.estimateGasPrice();

        for (const token of tokens) {
            try {
                const prices = await this.priceFetcher.fetchPrices(token);
                const opportunity = this.findArbitrageOpportunity(token, prices);
                
                if (opportunity) {
                    this.stats.totalOpportunities++;
                    const isProfitable = await this.profitCalculator.isProfitable(
                        opportunity,
                        gasPrice
                    );
                    
                    if (isProfitable) {
                        await this.executeArbitrage(opportunity);
                    }
                }
            } catch (error) {
                logger.error(`Error processing arbitrage for ${token}:`, error);
            }
        }
    }

    /**
     * Scan for liquidations
     */
    async scanLiquidations() {
        try {
            const liquidations = await this.liquidationMonitor.scanForOpportunities();
            for (const liq of liquidations) {
                this.stats.totalOpportunities++;
                await this.executeLiquidation(liq);
            }
        } catch (error) {
            logger.error('Error scanning for liquidations:', error);
        }
    }

    /**
     * Scan for UniswapX orders
     */
    async scanUniswapX() {
        try {
            const orders = await this.uniswapXMonitor.fetchOrders();
            for (const order of orders) {
                if (await this.uniswapXMonitor.isProfitable(order)) {
                    this.stats.totalOpportunities++;
                    await this.executeUniswapXFill(order);
                }
            }
        } catch (error) {
            logger.error('Error scanning for UniswapX orders:', error);
        }
    }
    
    /**
     * Find arbitrage opportunity from price data
     */
    findArbitrageOpportunity(token, prices) {
        // Find lowest and highest prices
        let lowestPrice = Infinity;
        let highestPrice = 0;
        let buyDex = null;
        let sellDex = null;
        
        for (const [dex, price] of Object.entries(prices)) {
            if (price < lowestPrice) {
                lowestPrice = price;
                buyDex = dex;
            }
            if (price > highestPrice) {
                highestPrice = price;
                sellDex = dex;
            }
        }
        
        // Calculate profit percentage
        const profitPercentage = ((highestPrice - lowestPrice) / lowestPrice) * 100;
        
        // Check if profitable
        const minProfit = this.config.bot.minProfitThreshold;
        if (profitPercentage > minProfit) {
            return {
                token,
                buyDex,
                sellDex,
                buyPrice: lowestPrice,
                sellPrice: highestPrice,
                profitPercentage,
                timestamp: Date.now()
            };
        }
        
        return null;
    }
    
    /**
     * Execute arbitrage trade
     */
    async executeArbitrage(opportunity) {
        logger.info('⚡ Executing arbitrage...', opportunity);
        this.stats.executedTrades++;
        
        try {
            const tradeAmount = await this.calculateOptimalTradeAmount(opportunity);
            const routers = this.getRouterAddresses(opportunity);
            
            // New encoding format: (Strategy strategy, bytes strategyData)
            const arbitrageData = this.encodeArbitrageData(opportunity, routers);
            const params = ethers.utils.defaultAbiCoder.encode(
                ['uint8', 'bytes'],
                [Strategy.Arbitrage, arbitrageData]
            );
            
            const gasPrice = await this.gasEstimator.estimateGasPrice();
            
            // Select provider based on configuration
            const providerName = this.config.bot.defaultFlashLoanProvider;
            const provider = providerName === 'sky' ? FlashLoanProvider.Sky : FlashLoanProvider.Balancer;

            // 1. Simulate transaction (Static Call)
            logger.info('🧪 Simulating transaction...');
            try {
                await this.arbitrageContract.callStatic.executeArbitrage(
                    opportunity.token,
                    ethers.utils.parseEther(tradeAmount.toString()),
                    provider,
                    params,
                    {
                        gasPrice: gasPrice,
                        gasLimit: 800000
                    }
                );
                logger.info('✅ Simulation successful');
            } catch (error) {
                logger.warn(`❌ Simulation failed: ${error.message}`);
                throw new Error(`Simulation failed: ${error.message}`);
            }

            // 2. Execute flashloan arbitrage
            const tx = await this.arbitrageContract.executeArbitrage(
                opportunity.token,
                ethers.utils.parseEther(tradeAmount.toString()),
                provider,
                params,
                {
                    gasPrice: gasPrice,
                    gasLimit: 800000
                }
            );
            
            logger.info(`📝 Transaction submitted: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                this.stats.successfulTrades++;
                logger.info('✅ Arbitrage executed successfully!');
                
                // Parse profit from events
                const profit = this.parseProfit(receipt);
                this.stats.totalProfit = this.stats.totalProfit.plus(profit);
                
                // Calculate gas spent
                const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                this.stats.totalGasSpent = this.stats.totalGasSpent.plus(
                    gasSpent.toString()
                );
                
                // Send notification
                const nativeSymbol = this.config.chain.nativeCurrency.symbol;
                const blockExplorer = this.config.chain.blockExplorer;
                await this.telegramNotifier.sendMessage(
                    `✅ Successful Arbitrage!\n` +
                    `Chain: ${this.config.chain.name}\n` +
                    `Token: ${opportunity.token}\n` +
                    `Profit: ${ethers.utils.formatEther(profit)} ${nativeSymbol}\n` +
                    `Gas: ${ethers.utils.formatEther(gasSpent)} ${nativeSymbol}\n` +
                    `Tx: ${blockExplorer}/tx/${tx.hash}`
                );
                
                // Store trade
                this.executedTrades.push({
                    ...opportunity,
                    txHash: tx.hash,
                    profit: profit.toString(),
                    gasSpent: gasSpent.toString(),
                    success: true
                });
            } else {
                throw new Error('Transaction failed');
            }
            
        } catch (error) {
            this.stats.failedTrades++;
            logger.error('❌ Arbitrage execution failed:', error);
            
            await this.telegramNotifier.sendMessage(
                `❌ Failed Arbitrage\n` +
                `Token: ${opportunity.token}\n` +
                `Error: ${error.message}`
            );
        }
    }
    
    /**
     * Calculate optimal trade amount based on liquidity
     */
    async calculateOptimalTradeAmount(opportunity) {
        // This is a simplified version
        // In production, you'd want to consider liquidity depth, slippage, etc.
        const maxTradeSize = new BigNumber(this.config.bot.maxTradeSize);
        
        // Start with 1 ETH worth of tokens
        let optimalAmount = new BigNumber(1);
        
        // Don't exceed max trade size
        if (optimalAmount.gt(maxTradeSize)) {
            optimalAmount = maxTradeSize;
        }
        
        return optimalAmount.toFixed(18);
    }
    
    /**
     * Get router addresses for DEXes
     */
    getRouterAddresses(opportunity) {
        // Try to get from full DEX config first
        const dexesFull = this.config.dexesFull || {};
        const buyDex = dexesFull[opportunity.buyDex];
        const sellDex = dexesFull[opportunity.sellDex];
        
        let buyRouter, sellRouter;
        
        if (buyDex && buyDex.router) {
            buyRouter = buyDex.router;
        } else {
            // Fallback to flattened config
            const routerKey = `${opportunity.buyDex}Router`;
            buyRouter = this.config.dexes[routerKey] || this.config.dexes[opportunity.buyDex];
        }
        
        if (sellDex && sellDex.router) {
            sellRouter = sellDex.router;
        } else {
            // Fallback to flattened config
            const routerKey = `${opportunity.sellDex}Router`;
            sellRouter = this.config.dexes[routerKey] || this.config.dexes[opportunity.sellDex];
        }
        
        return {
            buyRouter: buyRouter,
            sellRouter: sellRouter
        };
    }
    
    /**
     * Execute UniswapX Fill
     */
    async executeUniswapXFill(order) {
        logger.info('⚡ Executing UniswapX Fill...', order.hash);
        this.stats.executedTrades++;

        try {
            // Strategy 3: UniswapX Filling
            // Source: Balancer (0% Fee)
            // Hedge: 0x Protocol (Gas Efficient)
            // Target: UniswapX (Atomic Profit)

            const assetIn = order.inputToken;
            const amountIn = order.inputAmount;
            const assetOut = order.outputToken;

            // In a real bot, you'd get the 0x quote here
            const targetHedge = this.config.contracts.zeroXExchangeProxy;
            const hedgeData = "0x..."; // Encoded 0x swap data

            const strategyData = ethers.utils.defaultAbiCoder.encode(
                ['address', 'bytes', 'address', 'bytes', 'address'],
                [order.reactor, order.encodedOrder, targetHedge, hedgeData, assetOut]
            );

            const params = ethers.utils.defaultAbiCoder.encode(
                ['uint8', 'bytes'],
                [Strategy.UniswapXFilling, strategyData]
            );

            const gasPrice = await this.gasEstimator.estimateGasPrice();

            const providerName = this.config.bot.defaultFlashLoanProvider;
            const provider = providerName === 'sky' ? FlashLoanProvider.Sky : FlashLoanProvider.Balancer;

            // Simulate UniswapX Fill
            logger.info('🧪 Simulating UniswapX Fill...');
            try {
                await this.arbitrageContract.callStatic.executeArbitrage(
                    assetIn,
                    amountIn,
                    provider,
                    params,
                    {
                        gasPrice: gasPrice,
                        gasLimit: 1200000
                    }
                );
                logger.info('✅ UniswapX simulation successful');
            } catch (error) {
                logger.warn(`❌ UniswapX simulation failed: ${error.message}`);
                throw new Error(`UniswapX simulation failed: ${error.message}`);
            }

            const tx = await this.arbitrageContract.executeArbitrage(
                assetIn,
                amountIn,
                provider,
                params,
                {
                    gasPrice: gasPrice,
                    gasLimit: 1200000
                }
            );

            const receipt = await tx.wait();
            if (receipt.status === 1) {
                this.stats.successfulTrades++;
                logger.info('✅ UniswapX Fill executed successfully!');
            }
        } catch (error) {
            this.stats.failedTrades++;
            logger.error('❌ UniswapX Fill execution failed:', error);
        }
    }

    /**
     * Execute liquidation
     */
    async executeLiquidation(liq) {
        logger.info('⚡ Executing liquidation...', liq.user);
        this.stats.executedTrades++;

        try {
            const debtAsset = liq.debtAsset;
            const collateralAsset = liq.collateralAsset;
            const debtAmount = liq.debtAmount;

            const routers = [this.config.dexes.uniswapV2Router, this.config.dexes.sushiswapRouter];
            const swapPath = [collateralAsset, debtAsset];
            const fees = [3000];

            const liquidationData = ethers.utils.defaultAbiCoder.encode(
                ['address', 'address', 'address[]', 'address[]', 'uint24[]', 'bool'],
                [collateralAsset, liq.user, swapPath, routers, fees, false]
            );

            const params = ethers.utils.defaultAbiCoder.encode(
                ['uint8', 'bytes'],
                [Strategy.Liquidation, liquidationData]
            );

            const gasPrice = await this.gasEstimator.estimateGasPrice();

            const providerName = this.config.bot.defaultFlashLoanProvider;
            const provider = providerName === 'sky' ? FlashLoanProvider.Sky : FlashLoanProvider.Balancer;

            // Simulate liquidation
            logger.info('🧪 Simulating liquidation...');
            try {
                await this.arbitrageContract.callStatic.executeArbitrage(
                    debtAsset,
                    debtAmount,
                    provider,
                    params,
                    {
                        gasPrice: gasPrice,
                        gasLimit: 1000000
                    }
                );
                logger.info('✅ Liquidation simulation successful');
            } catch (error) {
                logger.warn(`❌ Liquidation simulation failed: ${error.message}`);
                throw new Error(`Liquidation simulation failed: ${error.message}`);
            }

            const tx = await this.arbitrageContract.executeArbitrage(
                debtAsset,
                debtAmount,
                provider,
                params,
                {
                    gasPrice: gasPrice,
                    gasLimit: 1000000
                }
            );

            const receipt = await tx.wait();
            if (receipt.status === 1) {
                this.stats.successfulTrades++;
                logger.info('✅ Liquidation executed successfully!');
            }
        } catch (error) {
            this.stats.failedTrades++;
            logger.error('❌ Liquidation execution failed:', error);
        }
    }

    /**
     * Encode arbitrage data
     */
    encodeArbitrageData(opportunity, routers) {
        const wrappedNative = this.config.tokens.wrappedNative || this.config.tokens.weth || this.config.tokens.wbnb;
        const path = [opportunity.token, wrappedNative, opportunity.token];
        const routerAddresses = [routers.buyRouter, routers.sellRouter];
        
        const dexesFull = this.config.dexesFull || {};
        const buyDex = dexesFull[opportunity.buyDex];
        const sellDex = dexesFull[opportunity.sellDex];
        
        let buyFee = 3000;
        let sellFee = 3000;
        if (buyDex && buyDex.fee) buyFee = Math.round(buyDex.fee * 10000);
        if (sellDex && sellDex.fee) sellFee = Math.round(sellDex.fee * 10000);
        
        const fees = [buyFee, sellFee];
        
        return ethers.utils.defaultAbiCoder.encode(
            ['address[]', 'address[]', 'uint24[]', 'bool'],
            [path, routerAddresses, fees, false]
        );
    }
    
    /**
     * Parse profit from transaction receipt
     */
    parseProfit(receipt) {
        // Find ArbitrageExecuted event
        const event = receipt.events?.find(
            e => e.event === 'ArbitrageExecuted'
        );
        
        if (event && event.args) {
            return event.args.profit;
        }
        
        return ethers.BigNumber.from(0);
    }
    
    /**
     * Start mempool monitoring for frontrunning opportunities
     */
    startMempoolMonitoring() {
        logger.info('🔍 Starting mempool monitoring...');
        
        this.provider.on('pending', async (txHash) => {
            try {
                const tx = await this.provider.getTransaction(txHash);
                
                if (tx && tx.to) {
                    // Check if transaction is a DEX swap
                    await this.analyzePendingTransaction(tx);
                }
            } catch (error) {
                // Ignore errors for pending transactions
            }
        });
    }
    
    /**
     * Analyze pending transaction for opportunities
     */
    async analyzePendingTransaction(tx) {
        // Check if transaction is interacting with known DEX routers
        const dexRouters = Object.values(this.config.dexes);
        
        if (dexRouters.includes(tx.to.toLowerCase())) {
            // This is a DEX transaction
            // Analyze for sandwich attack or frontrun opportunity
            logger.debug('DEX transaction detected:', tx.hash);
            
            // TODO: Implement sandwich attack logic
            // This requires careful consideration of MEV ethics and regulations
        }
    }
    
    /**
     * Schedule periodic tasks
     */
    schedulePeriodicTasks() {
        // Send stats every hour
        cron.schedule('0 * * * *', async () => {
            await this.telegramNotifier.sendMessage(
                '📊 Hourly Stats\n' + this.getStatsMessage()
            );
        });
        
        // Daily summary at midnight
        cron.schedule('0 0 * * *', async () => {
            await this.telegramNotifier.sendMessage(
                '📈 Daily Summary\n' + this.getStatsMessage()
            );
            
            // Reset daily stats
            this.stats.totalOpportunities = 0;
            this.stats.executedTrades = 0;
            this.stats.successfulTrades = 0;
            this.stats.failedTrades = 0;
        });
    }
    
    /**
     * Get stats message
     */
    getStatsMessage() {
        const nativeSymbol = this.config.chain.nativeCurrency.symbol;
        return `
Chain: ${this.config.chain.name}
Opportunities Found: ${this.stats.totalOpportunities}
Trades Executed: ${this.stats.executedTrades}
Successful: ${this.stats.successfulTrades}
Failed: ${this.stats.failedTrades}
Total Profit: ${ethers.utils.formatEther(this.stats.totalProfit.toFixed())} ${nativeSymbol}
Total Gas: ${ethers.utils.formatEther(this.stats.totalGasSpent.toFixed())} ${nativeSymbol}
Net Profit: ${ethers.utils.formatEther(
            this.stats.totalProfit.minus(this.stats.totalGasSpent).toFixed()
        )} ${nativeSymbol}
        `.trim();
    }
}

module.exports = ArbitrageBot;

