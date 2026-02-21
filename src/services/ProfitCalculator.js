/**
 * ProfitCalculator - Calculates potential profits and validates opportunities
 */

const { ethers } = require('ethers');
const BigNumber = require('bignumber.js');
const logger = require('../utils/logger');

class ProfitCalculator {
    constructor(config) {
        this.config = config;
        this.flashloanFee = 0.0009; // 0.09% Aave flashloan fee
        this.zeroFee = 0.0; // 0% Balancer/Sky fee
        this.dexFee = 0.003; // 0.3% typical DEX fee
    }
    
    /**
     * Calculate potential profit for an arbitrage opportunity
     */
    calculateProfit(opportunity, tradeAmount, gasPrice, isZeroFee = false) {
        const amount = new BigNumber(tradeAmount);
        const buyPrice = new BigNumber(opportunity.buyPrice);
        const sellPrice = new BigNumber(opportunity.sellPrice);
        
        // Calculate amounts after fees
        const buyAmount = amount.multipliedBy(1 - this.dexFee);
        const sellAmount = buyAmount.multipliedBy(sellPrice).dividedBy(buyPrice);
        const finalAmount = sellAmount.multipliedBy(1 - this.dexFee);
        
        // Subtract flashloan fee
        const currentFlashloanFee = isZeroFee ? this.zeroFee : this.flashloanFee;
        const flashloanFeeAmount = amount.multipliedBy(currentFlashloanFee);
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
     * Check if opportunity is profitable
     */
    async isProfitable(opportunity, gasPrice, isZeroFee = false) {
        // Use standard trade amount
        const tradeAmount = this.config.bot.maxTradeSize || 1;
        
        const profit = this.calculateProfit(opportunity, tradeAmount, gasPrice, isZeroFee);
        
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
     * Calculate price impact
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

