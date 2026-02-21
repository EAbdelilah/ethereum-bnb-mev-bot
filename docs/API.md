# 📚 API Documentation - Ethereum MEV Arbitrage Bot

## Table of Contents
- [Overview](#overview)
- [Core Classes](#core-classes)
- [Services](#services)
- [Utilities](#utilities)
- [Smart Contract ABI](#smart-contract-abi)
- [Configuration](#configuration)
- [Events](#events)

---

## Overview

This document describes the internal API structure of the MEV Arbitrage Bot. It's useful for developers who want to extend or customize the bot.

---

## Core Classes

### ArbitrageBot

Main bot class that orchestrates all operations.

#### Constructor

```javascript
new ArbitrageBot(wallet, provider, config)
```

**Parameters**:
- `wallet` (ethers.Wallet): Ethereum wallet instance
- `provider` (ethers.Provider): Ethereum provider (WebSocket recommended)
- `config` (Object): Configuration object

**Example**:
```javascript
const bot = new ArbitrageBot(wallet, provider, {
    minProfitThreshold: 0.01,
    maxGasPrice: 100,
    // ... other config
});
```

#### Methods

##### start()

Starts the bot and begins monitoring for opportunities.

```javascript
await bot.start()
```

**Returns**: `Promise<void>`

**Throws**: Error if bot is already running or initialization fails

---

##### stop()

Stops the bot and cleans up resources.

```javascript
await bot.stop()
```

**Returns**: `Promise<void>`

---

##### scanForOpportunities()

Scans all watched tokens for arbitrage opportunities.

```javascript
await bot.scanForOpportunities()
```

**Returns**: `Promise<void>`

**Side Effects**: May execute trades if profitable opportunities are found

---

##### findArbitrageOpportunity(token, prices)

Finds arbitrage opportunity from price data.

```javascript
const opportunity = bot.findArbitrageOpportunity(tokenAddress, {
    uniswapV2: 2000,
    sushiswap: 2005,
    uniswapV3: 2002
})
```

**Parameters**:
- `token` (string): Token address
- `prices` (Object): Price object with DEX names as keys

**Returns**: `Object | null` - Opportunity object or null if none found

**Opportunity Object**:
```javascript
{
    token: "0x...",
    buyDex: "uniswapV2",
    sellDex: "sushiswap",
    buyPrice: 2000,
    sellPrice: 2005,
    profitPercentage: 0.25,
    timestamp: 1234567890
}
```

---

##### executeArbitrage(opportunity, strategyType)

Executes an arbitrage trade (Spatial or Triangular).

```javascript
await bot.executeArbitrage(opportunity, Strategy.SpatialArbitrage)
```

**Parameters**:
- `opportunity` (Object): Opportunity object from `findArbitrageOpportunity()`
- `strategyType` (number): Strategy type from the `Strategy` enum

**Returns**: `Promise<void>`

**Throws**: Error if execution fails

**Events Emitted**:
- On success: Logs trade, updates stats, sends Telegram notification
- On failure: Logs error, sends error notification

---

##### getStatsMessage()

Returns formatted statistics message.

```javascript
const stats = bot.getStatsMessage()
```

**Returns**: `string` - Formatted statistics

**Example Output**:
```
Opportunities Found: 42
Trades Executed: 10
Successful: 9
Failed: 1
Total Profit: 0.245 ETH
Total Gas: 0.089 ETH
Net Profit: 0.156 ETH
```

---

## Services

### PriceFetcher

Fetches token prices from multiple DEXes.

#### Constructor

```javascript
new PriceFetcher(provider, config)
```

#### Methods

##### fetchPrices(tokenAddress)

Fetches prices for a token from all configured DEXes.

```javascript
const prices = await priceFetcher.fetchPrices("0x...")
```

**Parameters**:
- `tokenAddress` (string): ERC20 token address

**Returns**: `Promise<Object>` - Price object

**Example Return**:
```javascript
{
    uniswapV2: 2000.50,
    sushiswap: 2005.25,
    uniswapV3: 2002.10
}
```

**Note**: Returns `null` for DEXes where the pair doesn't exist

---

##### getUniswapV2Price(tokenAddress, wethAddress)

Gets price from Uniswap V2.

```javascript
const price = await priceFetcher.getUniswapV2Price(token, weth)
```

**Returns**: `Promise<number | null>`

---

##### getSushiSwapPrice(tokenAddress, wethAddress)

Gets price from SushiSwap.

```javascript
const price = await priceFetcher.getSushiSwapPrice(token, weth)
```

**Returns**: `Promise<number | null>`

---

##### getUniswapV3Price(tokenAddress, wethAddress)

Gets price from Uniswap V3.

```javascript
const price = await priceFetcher.getUniswapV3Price(token, weth)
```

**Returns**: `Promise<number | null>`

---

##### clearCache()

Clears the price cache.

```javascript
priceFetcher.clearCache()
```

---

### GasEstimator

Estimates gas prices for optimal transaction execution.

#### Constructor

```javascript
new GasEstimator(provider)
```

#### Methods

##### estimateGasPrice()

Estimates current gas price with buffer.

```javascript
const gasPrice = await gasEstimator.estimateGasPrice()
```

**Returns**: `Promise<BigNumber>` - Gas price in wei

---

##### estimateEIP1559GasPrice()

Estimates EIP-1559 gas parameters.

```javascript
const { maxFeePerGas, maxPriorityFeePerGas } = 
    await gasEstimator.estimateEIP1559GasPrice()
```

**Returns**: `Promise<Object>`

---

##### getExternalGasPrice()

Gets gas price from external API (Etherscan).

```javascript
const prices = await gasEstimator.getExternalGasPrice()
```

**Returns**: `Promise<Object>`

**Example Return**:
```javascript
{
    safe: BigNumber,      // Conservative gas price
    standard: BigNumber,  // Standard gas price
    fast: BigNumber       // Fast gas price
}
```

---

##### estimateGasLimit(transaction)

Estimates gas limit for a transaction.

```javascript
const gasLimit = await gasEstimator.estimateGasLimit({
    to: contractAddress,
    data: encodedData
})
```

**Returns**: `Promise<BigNumber>`

---

##### calculateTransactionCost(gasLimit, gasPrice)

Calculates total transaction cost.

```javascript
const cost = gasEstimator.calculateTransactionCost(gasLimit, gasPrice)
```

**Returns**: `BigNumber` - Cost in wei

---

##### isGasPriceAcceptable(gasPrice, maxGasPrice)

Checks if gas price is within acceptable range.

```javascript
const acceptable = gasEstimator.isGasPriceAcceptable(
    currentGasPrice,
    maxGasPrice
)
```

**Returns**: `boolean`

---

##### getOptimalGasPrice(urgency)

Gets optimal gas price based on urgency.

```javascript
const gasPrice = await gasEstimator.getOptimalGasPrice('fast')
```

**Parameters**:
- `urgency` (string): 'safe' | 'standard' | 'fast'

**Returns**: `Promise<BigNumber>`

---

### ProfitCalculator

Calculates potential profits and validates opportunities.

#### Constructor

```javascript
new ProfitCalculator(config)
```

#### Methods

##### calculateProfit(opportunity, tradeAmount, gasPrice)

Calculates detailed profit breakdown.

```javascript
const profit = profitCalculator.calculateProfit(
    opportunity,
    10, // 10 ETH trade
    gasPrice
)
```

**Returns**: `Object`

**Return Object**:
```javascript
{
    grossProfit: BigNumber,      // Before fees
    flashloanFee: BigNumber,     // Aave fee
    gasCost: BigNumber,          // Gas cost in ETH
    netProfit: BigNumber,        // Final profit
    profitPercentage: BigNumber  // Profit %
}
```

---

##### isProfitable(opportunity, gasPrice)

Checks if opportunity is profitable.

```javascript
const profitable = await profitCalculator.isProfitable(
    opportunity,
    gasPrice
)
```

**Returns**: `Promise<boolean>`

---

##### calculateOptimalTradeSize(opportunity, availableLiquidity)

Calculates optimal trade size.

```javascript
const size = profitCalculator.calculateOptimalTradeSize(
    opportunity,
    availableLiquidity
)
```

**Returns**: `BigNumber` - Optimal trade size

---

##### estimateSlippage(tradeAmount, liquidity)

Estimates slippage for a trade.

```javascript
const slippage = profitCalculator.estimateSlippage(
    tradeAmount,
    liquidity
)
```

**Returns**: `BigNumber` - Slippage percentage

---

##### calculatePriceImpact(tradeAmount, reserve0, reserve1)

Calculates price impact using constant product formula.

```javascript
const impact = profitCalculator.calculatePriceImpact(
    tradeAmount,
    reserve0,
    reserve1
)
```

**Returns**: `Object`

```javascript
{
    priceImpact: BigNumber,
    executionPrice: BigNumber,
    expectedOutput: BigNumber
}
```

---

##### calculateBreakEvenGasPrice(opportunity, tradeAmount)

Calculates break-even gas price.

```javascript
const breakEven = profitCalculator.calculateBreakEvenGasPrice(
    opportunity,
    tradeAmount
)
```

**Returns**: `BigNumber` - Gas price in wei

---

##### getProfitabilityScore(opportunity, gasPrice)

Gets profitability score (0-100).

```javascript
const score = profitCalculator.getProfitabilityScore(
    opportunity,
    gasPrice
)
```

**Returns**: `number` - Score from 0 to 100

---

### TelegramNotifier

Sends notifications via Telegram bot.

#### Constructor

```javascript
new TelegramNotifier(config)
```

#### Methods

##### sendMessage(message)

Sends a plain text message.

```javascript
await telegramNotifier.sendMessage("Bot started!")
```

**Parameters**:
- `message` (string): Message text (supports HTML)

**Returns**: `Promise<void>`

---

##### sendOpportunityAlert(opportunity)

Sends formatted opportunity alert.

```javascript
await telegramNotifier.sendOpportunityAlert(opportunity)
```

---

##### sendSuccessNotification(trade)

Sends success notification.

```javascript
await telegramNotifier.sendSuccessNotification(trade)
```

---

##### sendErrorNotification(error, context)

Sends error notification.

```javascript
await telegramNotifier.sendErrorNotification(error, "Trading")
```

---

##### sendDailySummary(stats)

Sends daily summary.

```javascript
await telegramNotifier.sendDailySummary(stats)
```

---

## Utilities

### Logger

Winston-based logger with multiple transports.

#### Methods

```javascript
logger.debug("Debug message", { data })
logger.info("Info message")
logger.warn("Warning message")
logger.error("Error message", error)
```

**Log Levels**:
- `debug`: Detailed debugging information
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages

**Log Files**:
- `logs/combined.log`: All logs
- `logs/error.log`: Errors only
- `logs/trades.log`: Trade information

---

## Smart Contract ABI

### FlashloanArbitrage Contract

#### executeArbitrage

Executes a strategy with flashloan (0% fee).

```javascript
await contract.executeArbitrage(
    assetAddress,
    amount,
    provider,
    encodedParams,
    { gasPrice, gasLimit }
)
```

**Parameters**:
- `asset` (address): Token to borrow
- `amount` (uint256): Amount to borrow
- `provider` (uint8): Flashloan provider (0: Balancer, 1: Sky)
- `params` (bytes): Encoded strategy parameters

---

#### withdrawProfits

Withdraws profits to owner.

```javascript
await contract.withdrawProfits(tokenAddress, amount)
```

---

#### setMinProfitBasisPoints

Sets minimum profit threshold.

```javascript
await contract.setMinProfitBasisPoints(50) // 0.5%
```

---

#### emergencyWithdraw

Emergency withdraw function.

```javascript
await contract.emergencyWithdraw(tokenAddress)
```

---

#### getBalance

Gets token balance of contract.

```javascript
const balance = await contract.getBalance(tokenAddress)
```

---

## Configuration

### Config Object Structure

```javascript
{
    network: {
        rpcUrl: string,
        wssUrl: string,
        chainId: number
    },
    wallet: {
        privateKey: string,
        address: string
    },
    contracts: {
        arbitrageContract: string,
        aaveLendingPool: string
    },
    dexes: {
        uniswapV2Router: string,
        uniswapV3Router: string,
        sushiswapRouter: string,
        // ... factory addresses
    },
    tokens: {
        weth: string,
        watchlist: string[]
    },
    bot: {
        minProfitThreshold: number,
        maxGasPrice: number,
        slippageTolerance: number,
        checkInterval: number,
        maxTradeSize: number,
        enableMempoolMonitoring: boolean
    },
    telegram: {
        enabled: boolean,
        botToken: string,
        chatId: string
    },
    logging: {
        enabled: boolean,
        level: string
    }
}
```

---

## Events

### Smart Contract Events

#### ArbitrageExecuted

Emitted when arbitrage is successfully executed.

```solidity
event ArbitrageExecuted(
    address indexed token,
    uint256 profit,
    uint256 timestamp
)
```

---

#### FlashLoanReceived

Emitted when flashloan is received.

```solidity
event FlashLoanReceived(
    address indexed asset,
    uint256 amount,
    uint256 premium
)
```

---

#### ProfitWithdrawn

Emitted when profits are withdrawn.

```solidity
event ProfitWithdrawn(
    address indexed token,
    uint256 amount,
    address indexed recipient
)
```

---

## Error Handling

### Custom Errors

#### InsufficientProfit

Thrown when profit is below minimum threshold.

```solidity
error InsufficientProfit()
```

---

#### UnauthorizedCaller

Thrown when non-owner tries to execute restricted function.

```solidity
error UnauthorizedCaller()
```

---

#### ArbitrageFailed

Thrown when arbitrage execution fails.

```solidity
error ArbitrageFailed()
```

---

#### InvalidParameters

Thrown when invalid parameters are provided.

```solidity
error InvalidParameters()
```

---

## Examples

### Complete Bot Usage

```javascript
const { ethers } = require('ethers');
const ArbitrageBot = require('./bot/ArbitrageBot');
const config = require('./config/config');

// Setup
const provider = new ethers.providers.WebSocketProvider(config.network.wssUrl);
const wallet = new ethers.Wallet(config.wallet.privateKey, provider);

// Create bot
const bot = new ArbitrageBot(wallet, provider, config);

// Start
await bot.start();

// Bot runs automatically...

// Stop when needed
await bot.stop();
```

---

### Manual Arbitrage Execution

```javascript
// Fetch prices
const prices = await priceFetcher.fetchPrices(tokenAddress);

// Find opportunity
const opportunity = bot.findArbitrageOpportunity(tokenAddress, prices);

if (opportunity) {
    // Check profitability
    const gasPrice = await gasEstimator.estimateGasPrice();
    const profitable = await profitCalculator.isProfitable(opportunity, gasPrice);
    
    if (profitable) {
        // Execute
        await bot.executeArbitrage(opportunity);
    }
}
```

---

## Rate Limits

### RPC Provider

- Infura Free: 100,000 requests/day
- Alchemy Free: 300M compute units/month
- Consider paid plans for production

### Telegram Bot

- 30 messages per second
- 20 messages per minute to same chat

---

## Best Practices

1. **Always validate inputs** before executing trades
2. **Use try-catch blocks** for all async operations
3. **Log important events** for debugging
4. **Test on testnet** before mainnet deployment
5. **Monitor gas prices** to avoid expensive transactions
6. **Implement circuit breakers** for safety
7. **Regular backups** of configuration and logs

---

## Support & Contributing

- Report bugs via GitHub Issues
- Submit PRs for improvements
- Join our Telegram community
- Read CONTRIBUTING.md for guidelines

---

**Last Updated**: October 2025
**Version**: 1.0.0

