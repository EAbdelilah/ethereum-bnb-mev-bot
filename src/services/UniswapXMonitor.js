/**
 * UniswapXMonitor - Monitors UniswapX for order filling opportunities
 */

const axios = require('axios');
const logger = require('../utils/logger');

class UniswapXMonitor {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.apiUrl = 'https://api.uniswap.org/v2/uniswapx/orders'; // Example API endpoint
    }

    /**
     * Fetch open orders from UniswapX API
     */
    async fetchOrders() {
        try {
            // UniswapX public API endpoint for mainnet
            const endpoint = 'https://api.uniswap.org/v2/uniswapx/orders?orderStatus=open&chainId=' + this.config.network.chainId;

            logger.debug(`Fetching UniswapX orders from: ${endpoint}`);
            const response = await axios.get(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://app.uniswap.org'
                }
            });

            if (response.data && response.data.orders) {
                logger.info(`Found ${response.data.orders.length} open UniswapX orders`);
                return response.data.orders.map(order => ({
                    hash: order.orderHash,
                    inputToken: order.input.token,
                    inputAmount: order.input.amount,
                    outputToken: order.outputs[0].token,
                    outputAmount: order.outputs[0].amount,
                    reactor: order.reactor,
                    encodedOrder: order.encodedOrder
                }));
            }
            return [];
        } catch (error) {
            logger.error('Error fetching UniswapX orders:', error.message);
            return [];
        }
    }

    /**
     * Calculate if an order is profitable to fill
     */
    async isProfitable(order) {
        try {
            // 1. Get input/output amounts
            const amountIn = ethers.BigNumber.from(order.inputAmount);
            const minAmountOut = ethers.BigNumber.from(order.outputAmount);

            // 2. Simulate hedge (e.g., via 0x API or Quoter)
            // For production, you'd call 0x /swap/v1/quote here
            // const hedgeQuote = await axios.get(`https://api.0x.org/swap/v1/quote?buyToken=${order.inputToken}&sellToken=${order.outputToken}&sellAmount=${minAmountOut}`);

            // Placeholder: Assume 1% profit margin for simulation purposes if no API key
            const estimatedHedgeOutput = amountIn.mul(101).div(100);

            // 3. Subtract gas costs
            const gasPrice = await this.provider.getGasPrice();
            const gasLimit = 1200000;
            const gasCost = gasPrice.mul(gasLimit);

            const netProfit = estimatedHedgeOutput.sub(amountIn).sub(gasCost);

            return netProfit.gt(0);
        } catch (error) {
            logger.error('Error calculating UniswapX profitability:', error);
            return false;
        }
    }
}

module.exports = UniswapXMonitor;
