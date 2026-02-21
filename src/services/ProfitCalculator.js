/**
 * ProfitCalculator - Calculates potential profits and validates opportunities
 */

const { ethers } = require('ethers');
const BigNumber = require('bignumber.js');
const logger = require('../utils/logger');

class ProfitCalculator {
    constructor(config, provider) {
        this.config = config;
        this.provider = provider;
        this.flashloanFee = 0.0; // Only 0% fee providers used
        this.dexFee = 0.003; // 0.3% typical DEX fee

        this.UNISWAP_V3_QUOTER_ABI = [
            'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
        ];
    }
    
    /**
     * Calculate potential profit for an arbitrage opportunity
     */
    calculateProfit(opportunity, tradeAmount, gasPrice, reserves = null) {
        const amount = new BigNumber(tradeAmount);
        
        let finalAmount;
        if (reserves && reserves.buyDex && reserves.sellDex) {
            // Precise Uniswap V2 calculation: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
            const buyOutput = this.calculateAmountOut(amount, reserves.buyDex.reserveIn, reserves.buyDex.reserveOut);
            finalAmount = this.calculateAmountOut(buyOutput, reserves.sellDex.reserveIn, reserves.sellDex.reserveOut);
        } else {
            // Simplified price-based calculation
            const buyPrice = new BigNumber(opportunity.buyPrice);
            const sellPrice = new BigNumber(opportunity.sellPrice);
            const buyAmount = amount.multipliedBy(1 - this.dexFee);
            const sellAmount = buyAmount.multipliedBy(sellPrice).dividedBy(buyPrice);
            finalAmount = sellAmount.multipliedBy(1 - this.dexFee);
        }
        
        // Subtract flashloan fee (0% as requested)
        const flashloanFeeAmount = amount.multipliedBy(this.flashloanFee);
        const netAmount = finalAmount.minus(amount).minus(flashloanFeeAmount);
        
        // Calculate gas cost
        const gasLimit = 500000; // Estimated gas limit
        const gasCost = new BigNumber(gasPrice.toString())
            .multipliedBy(gasLimit)
            .dividedBy(1e18);
        
        // Final profit
        const profit = netAmount.minus(gasCost);
        
        return {
            grossProfit: finalAmount.minus(amount),
            flashloanFee: flashloanFeeAmount,
            gasCost: gasCost,
            netProfit: profit,
            profitPercentage: profit.dividedBy(amount).multipliedBy(100)
        };
    }
    
    /**
     * Uniswap V2 exact amount out formula
     */
    calculateAmountOut(amountIn, reserveIn, reserveOut) {
        const aIn = new BigNumber(amountIn);
        const rIn = new BigNumber(reserveIn);
        const rOut = new BigNumber(reserveOut);

        const amountInWithFee = aIn.multipliedBy(997);
        const numerator = amountInWithFee.multipliedBy(rOut);
        const denominator = rIn.multipliedBy(1000).plus(amountInWithFee);
        return numerator.dividedBy(denominator);
    }

    /**
     * Check if opportunity is profitable
     */
    async isProfitable(opportunity, gasPrice, reserves = null) {
        // Use standard trade amount
        const tradeAmount = this.config.bot.maxTradeSize || 1;
        
        const profit = this.calculateProfit(opportunity, tradeAmount, gasPrice, reserves);
        
        logger.debug('Profit calculation:', {
            grossProfit: profit.grossProfit.toFixed(6),
            flashloanFee: profit.flashloanFee.toFixed(6),
            gasCost: profit.gasCost.toFixed(6),
            netProfit: profit.netProfit.toFixed(6),
            profitPercentage: profit.profitPercentage.toFixed(4)
        });
        
        // Check if net profit meets minimum threshold
        const minProfitThreshold = new BigNumber(this.config.bot.minProfitThreshold);
        
        return profit.netProfit.isGreaterThan(minProfitThreshold);
    }
    
    /**
     * Calculate optimal trade size
     * Uses calculus to find the trade size that maximizes profit
     */
    calculateOptimalTradeSize(opportunity, availableLiquidity) {
        // Simplified calculation
        // In production, you'd want to use more sophisticated algorithms
        // that consider liquidity depth, price impact, etc.
        
        const maxSize = new BigNumber(this.config.bot.maxTradeSize);
        const liquidity = new BigNumber(availableLiquidity);
        
        // Use 80% of available liquidity to minimize slippage
        const optimalSize = BigNumber.min(maxSize, liquidity.multipliedBy(0.8));
        
        return optimalSize;
    }
    
    /**
     * Estimate slippage for a trade
     */
    estimateSlippage(tradeAmount, liquidity) {
        const amount = new BigNumber(tradeAmount);
        const liq = new BigNumber(liquidity);
        
        // Simple linear slippage model
        // Real slippage depends on the AMM curve (x*y=k for Uniswap V2)
        const slippage = amount.dividedBy(liq).multipliedBy(100);
        
        return slippage;
    }
    
    /**
     * Precise output estimation using Uniswap V3 Quoter
     */
    async getUniswapV3Quote(tokenIn, tokenOut, fee, amountIn, quoterAddress) {
        try {
            const quoter = new ethers.Contract(quoterAddress, this.UNISWAP_V3_QUOTER_ABI, this.provider);
            const quote = await quoter.callStatic.quoteExactInputSingle(
                tokenIn,
                tokenOut,
                fee,
                amountIn,
                0
            );
            return new BigNumber(quote.toString());
        } catch (error) {
            logger.debug(`Quoter failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Calculate price impact for Uniswap V2 (x*y=k)
     */
    calculatePriceImpact(tradeAmount, reserve0, reserve1) {
        const amountIn = new BigNumber(tradeAmount);
        const reserveIn = new BigNumber(reserve0);
        const reserveOut = new BigNumber(reserve1);
        
        // Using constant product formula: x * y = k
        const amountInWithFee = amountIn.multipliedBy(997);
        const numerator = amountInWithFee.multipliedBy(reserveOut);
        const denominator = reserveIn.multipliedBy(1000).plus(amountInWithFee);
        const amountOut = numerator.dividedBy(denominator);
        
        // Calculate price impact
        const executionPrice = amountOut.dividedBy(amountIn);
        const spotPrice = reserveOut.dividedBy(reserveIn);
        const priceImpact = spotPrice.minus(executionPrice).dividedBy(spotPrice).multipliedBy(100);
        
        return {
            priceImpact: priceImpact,
            executionPrice: executionPrice,
            expectedOutput: amountOut
        };
    }
    
    /**
     * Validate if opportunity is still valid
     */
    isOpportunityValid(opportunity, maxAge = 5000) {
        const age = Date.now() - opportunity.timestamp;
        return age < maxAge;
    }
    
    /**
     * Calculate break-even gas price
     */
    calculateBreakEvenGasPrice(opportunity, tradeAmount) {
        const amount = new BigNumber(tradeAmount);
        const buyPrice = new BigNumber(opportunity.buyPrice);
        const sellPrice = new BigNumber(opportunity.sellPrice);
        
        // Calculate gross profit before gas
        const buyAmount = amount.multipliedBy(1 - this.dexFee);
        const sellAmount = buyAmount.multipliedBy(sellPrice).dividedBy(buyPrice);
        const finalAmount = sellAmount.multipliedBy(1 - this.dexFee);
        const flashloanFeeAmount = amount.multipliedBy(this.flashloanFee);
        const grossProfit = finalAmount.minus(amount).minus(flashloanFeeAmount);
        
        // Calculate break-even gas price
        const gasLimit = 500000;
        const breakEvenGasPrice = grossProfit.multipliedBy(1e18).dividedBy(gasLimit);
        
        return ethers.BigNumber.from(breakEvenGasPrice.toFixed(0));
    }
    
    /**
     * Get profitability score (0-100)
     */
    getProfitabilityScore(opportunity, gasPrice) {
        const tradeAmount = this.config.bot.maxTradeSize || 1;
        const profit = this.calculateProfit(opportunity, tradeAmount, gasPrice);
        
        // Score based on profit percentage and net profit
        const profitScore = Math.min(profit.profitPercentage.toNumber() * 10, 50);
        const amountScore = Math.min(profit.netProfit.toNumber() * 10, 50);
        
        return profitScore + amountScore;
    }
}

module.exports = ProfitCalculator;

