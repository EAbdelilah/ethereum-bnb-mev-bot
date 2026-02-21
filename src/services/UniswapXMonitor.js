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

            let estimatedHedgeOutput;

            // 2. Simulate hedge (e.g., via 0x API or Quoter)
            if (this.config.network.zeroXApiKey) {
                try {
                    const baseUrl = this.getZeroXBaseUrl(this.config.network.chainId);
                    const response = await axios.get(`${baseUrl}/swap/v1/price`, {
                        params: {
                            buyToken: order.inputToken,
                            sellToken: order.outputToken,
                            sellAmount: minAmountOut.toString(),
                        },
                        headers: {
                            '0x-api-key': this.config.network.zeroXApiKey
                        }
                    });
                    estimatedHedgeOutput = ethers.BigNumber.from(response.data.buyAmount);
                } catch (apiError) {
                    logger.warn(`0x API error during profitability check: ${apiError.message}`);
                    return false;
                }
            } else {
                // Placeholder: Assume 1% profit margin for simulation purposes if no API key
                estimatedHedgeOutput = amountIn.mul(101).div(100);
            }

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

    /**
     * Get 0x API base URL based on chain ID
     */
    getZeroXBaseUrl(chainId) {
        const urls = {
            1: 'https://api.0x.org',
            10: 'https://optimism.api.0x.org',
            56: 'https://bsc.api.0x.org',
            137: 'https://polygon.api.0x.org',
            42161: 'https://arbitrum.api.0x.org',
            43114: 'https://avalanche.api.0x.org',
            8453: 'https://base.api.0x.org',
            42220: 'https://celo.api.0x.org',
        };
        return urls[chainId] || 'https://api.0x.org';
    }
}

module.exports = UniswapXMonitor;
