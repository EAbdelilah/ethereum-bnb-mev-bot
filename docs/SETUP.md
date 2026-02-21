# 🚀 Setup Guide - Ethereum MEV Arbitrage Bot

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Running the Bot](#running-the-bot)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows 10+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 20GB+ free space
- **Network**: Stable internet connection with low latency

### Software Requirements
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Git**: Latest version

### Knowledge Requirements
- Basic understanding of Ethereum and DeFi
- Familiarity with command line interface
- Understanding of JavaScript/Node.js
- Knowledge of smart contracts (Solidity)

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/devstorm2576916/ethereum-mev-bot.git
cd ethereum-mev-bot
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using Yarn
yarn install
```

### Step 3: Install Hardhat (for smart contract deployment)

```bash
npm install --save-dev hardhat
```

### Step 4: Create Required Directories

```bash
mkdir -p logs
mkdir -p data
```

---

## Configuration

### Step 1: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` file with your settings:

```bash
# Network Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
ETHEREUM_WSS_URL=wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY
CHAIN_ID=1

# Wallet Configuration
PRIVATE_KEY=your_private_key_here_without_0x_prefix
WALLET_ADDRESS=0xYourWalletAddress

# Bot Configuration
MIN_PROFIT_THRESHOLD=0.01          # Minimum profit in ETH
MAX_GAS_PRICE=100                  # Maximum gas price in gwei
SLIPPAGE_TOLERANCE=0.5             # Slippage tolerance in %
CHECK_INTERVAL=1000                # Check interval in milliseconds
MAX_TRADE_SIZE=10                  # Maximum trade size in ETH
ENABLE_MEMPOOL_MONITORING=false    # Enable mempool monitoring

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Logging
ENABLE_LOGGING=true
LOG_LEVEL=info                     # debug, info, warn, error
```

### Step 3: Obtain Required API Keys

#### Infura (or Alchemy)

1. Go to [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
2. Create a free account
3. Create a new project
4. Copy the API key and WebSocket URL

#### Telegram Bot (Optional)

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token

To get your Chat ID:
1. Search for `@userinfobot` on Telegram
2. Start a chat
3. It will send you your Chat ID

### Step 4: Fund Your Wallet

Your wallet needs ETH for gas fees:

```
Recommended: 0.5 - 1.0 ETH for gas fees
```

**⚠️ Warning**: 
- NEVER share your private key
- Use a separate wallet for the bot
- Don't store large amounts in the bot wallet

---

## Smart Contract Deployment

### Step 1: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 5 Solidity files successfully
```

### Step 2: Test Contracts (Optional but Recommended)

```bash
npx hardhat test
```

### Step 3: Deploy to Testnet (Recommended First)

Update `hardhat.config.js` to use Goerli or Sepolia testnet:

```bash
npx hardhat run scripts/deploy.js --network goerli
```

### Step 4: Deploy to Mainnet

**⚠️ Warning**: Ensure you have enough ETH for deployment gas fees (~0.05-0.1 ETH)

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

Expected output:
```
🚀 Deploying FlashloanArbitrage contract...
📝 Deploying with account: 0x...
💰 Account balance: ...
✅ FlashloanArbitrage deployed to: 0x...

📋 Add this to your .env file:
ARBITRAGE_CONTRACT_ADDRESS=0x...
```

### Step 5: Update Environment Variables

Add the deployed contract address to your `.env` file:

```bash
ARBITRAGE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### Step 6: Verify Contract on Etherscan (Optional)

```bash
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS \
  AAVE_ADDRESS_PROVIDER \
  UNISWAP_V2_ROUTER \
  SUSHISWAP_ROUTER \
  UNISWAP_V3_ROUTER
```

---

## Running the Bot

### Option 1: Production Mode

```bash
npm start
```

### Option 2: Development Mode (with auto-reload)

```bash
npm run dev
```

### Option 3: Using PM2 (Recommended for 24/7 operation)

Install PM2:
```bash
npm install -g pm2
```

Start the bot:
```bash
pm2 start src/index.js --name "mev-bot"
```

---

## 🌐 Running on Multiple Chains (L2s)

The bot supports running on 22+ different chains (Polygon, Base, Optimism, etc.) using dynamic RPC loading.

### 1. Configure RPCs for Multiple Chains

In your `.env` file, you can specify RPCs for each chain using their Chain ID:

```env
# Polygon (Chain ID 137)
RPC_URL_137=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
# Base (Chain ID 8453)
RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
# Optimism (Chain ID 10)
RPC_URL_10=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### 2. Run Single Instance

To run the bot on a specific chain, set the `CHAIN_ID` environment variable:

```bash
# Run on Polygon
CHAIN_ID=137 npm start

# Run on Base
CHAIN_ID=8453 npm start
```

### 3. Run Multiple Instances Simultaneously (Recommended)

Use PM2 to manage multiple instances for different chains. Create a `ecosystem.config.js` file:

```javascript
module.exports = {
  apps : [
    {
      name: 'mev-bot-polygon',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 137
      }
    },
    {
      name: 'mev-bot-base',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 8453
      }
    },
    {
      name: 'mev-bot-optimism',
      script: 'src/index.js',
      env: {
        CHAIN_ID: 10
      }
    }
  ]
};
```

Then start all instances:
```bash
pm2 start ecosystem.config.js
```

Monitor:
```bash
pm2 monit
```

View logs:
```bash
pm2 logs mev-bot
```

Stop:
```bash
pm2 stop mev-bot
```

Restart:
```bash
pm2 restart mev-bot
```

---

## Testing

### Test on Hardhat Network (Local Blockchain)

1. Start local Hardhat node with mainnet fork:

```bash
npx hardhat node
```

2. In a new terminal, run the bot:

```bash
npm start
```

### Test on Testnet

1. Configure testnet in `.env`:

```bash
ETHEREUM_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_KEY
ETHEREUM_WSS_URL=wss://goerli.infura.io/ws/v3/YOUR_INFURA_KEY
CHAIN_ID=5
```

2. Get testnet ETH from faucets:
   - [Goerli Faucet](https://goerlifaucet.com/)
   - [Paradigm Faucet](https://faucet.paradigm.xyz/)

3. Run the bot:

```bash
npm start
```

### Dry Run Mode (Simulation)

You can modify the code to run in simulation mode:

```javascript
// In src/bot/ArbitrageBot.js
const DRY_RUN = true; // Don't execute real trades

if (!DRY_RUN) {
    await this.executeArbitrage(opportunity);
} else {
    logger.info('DRY RUN: Would execute arbitrage', opportunity);
}
```

---

## Monitoring

### View Logs

Real-time logs:
```bash
tail -f logs/combined.log
```

Error logs:
```bash
tail -f logs/error.log
```

Trade logs:
```bash
tail -f logs/trades.log
```

### Telegram Notifications

If configured, you'll receive notifications for:
- ✅ Bot started
- 💎 Opportunities found
- ✅ Successful trades
- ❌ Failed trades
- 📊 Hourly statistics
- 📈 Daily summaries

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to Ethereum network"

**Solution**:
- Check your RPC URL is correct
- Verify your internet connection
- Try a different RPC provider (Alchemy, Infura, Quicknode)

#### 2. "Insufficient funds for gas"

**Solution**:
- Check your wallet balance: `await wallet.getBalance()`
- Send more ETH to your wallet

#### 3. "Transaction underpriced"

**Solution**:
- Increase `MAX_GAS_PRICE` in `.env`
- The network is congested, wait or increase gas price

#### 4. "No arbitrage opportunities found"

**Solution**:
- This is normal - opportunities are rare
- Lower `MIN_PROFIT_THRESHOLD` (but be careful!)
- Add more tokens to watchlist
- Check market conditions (high volatility = more opportunities)

#### 5. "Contract execution reverted"

**Solution**:
- The trade was not profitable after all
- Slippage was too high
- Check contract has sufficient allowances

#### 6. "Rate limit exceeded"

**Solution**:
- You're making too many RPC calls
- Upgrade to paid Infura/Alchemy plan
- Increase cache timeout
- Reduce `CHECK_INTERVAL`

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

### Check Smart Contract

Verify contract is deployed correctly:

```bash
npx hardhat console --network mainnet
```

```javascript
const contract = await ethers.getContractAt(
    "FlashloanArbitrage",
    "YOUR_CONTRACT_ADDRESS"
);

// Check owner
await contract.owner();

// Check balance
await contract.getBalance("TOKEN_ADDRESS");
```

---

## Security Best Practices

### 1. Private Key Security

- ❌ NEVER commit `.env` file to Git
- ❌ NEVER share your private key
- ✅ Use a dedicated wallet for the bot
- ✅ Consider using a hardware wallet for large amounts
- ✅ Regularly rotate keys

### 2. Smart Contract Security

- ✅ Audit your smart contracts before deployment
- ✅ Use established libraries (OpenZeppelin)
- ✅ Test extensively on testnet
- ✅ Start with small amounts
- ✅ Implement emergency withdraw function

### 3. Operational Security

- ✅ Run on a secure server (not your personal computer)
- ✅ Use a VPS with firewall configured
- ✅ Keep software updated
- ✅ Monitor logs for suspicious activity
- ✅ Set up alerts for unusual behavior

### 4. Financial Security

- ✅ Start with small amounts
- ✅ Set strict profit thresholds
- ✅ Implement stop-loss mechanisms
- ✅ Regularly withdraw profits
- ✅ Don't invest more than you can afford to lose

### 5. API Security

- ✅ Use environment variables for API keys
- ✅ Rotate API keys regularly
- ✅ Use rate-limited endpoints
- ✅ Monitor API usage

---

## Performance Optimization

### 1. RPC Provider

Use a dedicated RPC provider with:
- Low latency (<50ms)
- High rate limits
- Archive node access (for historical data)
- WebSocket support

**Recommended Providers**:
- [Alchemy](https://www.alchemy.com/) - Free tier available
- [Infura](https://infura.io/) - Free tier available
- [QuickNode](https://www.quicknode.com/) - Paid, very fast
- [Ankr](https://www.ankr.com/) - Free tier available

### 2. Server Location

Deploy the bot on a server close to Ethereum nodes:
- AWS us-east-1 (Virginia)
- AWS eu-west-1 (Ireland)
- Use a VPS with good network connectivity

### 3. Code Optimization

- Reduce RPC calls with caching
- Use batch requests where possible
- Optimize gas usage in smart contracts
- Use WebSocket for real-time data

### 4. Database (Optional)

For high-frequency trading, consider adding Redis for:
- Price caching
- Rate limiting
- Session management

---

## Updating the Bot

### Update Dependencies

```bash
npm update
```

### Update Code

```bash
git pull origin main
npm install
```

### Update Smart Contract

If the contract is updated:
1. Deploy new contract
2. Update `ARBITRAGE_CONTRACT_ADDRESS` in `.env`
3. Withdraw funds from old contract
4. Restart bot

---

## Backup and Recovery

### Backup Important Files

```bash
# Backup environment file (store securely!)
cp .env .env.backup

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup configuration
cp -r config/ config-backup/
```

### Recovery Procedure

If something goes wrong:

1. **Stop the bot**:
   ```bash
   pm2 stop mev-bot
   ```

2. **Check contract funds**:
   ```bash
   npx hardhat console --network mainnet
   ```

3. **Emergency withdraw**:
   ```javascript
   const contract = await ethers.getContractAt("FlashloanArbitrage", "ADDRESS");
   await contract.emergencyWithdraw("TOKEN_ADDRESS");
   ```

4. **Check logs**:
   ```bash
   cat logs/error.log
   ```

5. **Restore from backup** if needed

---

## Next Steps

After successful setup:

1. ✅ Test on testnet thoroughly
2. ✅ Start with small amounts on mainnet
3. ✅ Monitor performance for 24-48 hours
4. ✅ Optimize parameters based on results
5. ✅ Gradually increase position sizes
6. ✅ Review and improve strategy

---

## Support

- 📧 Email: support@yourdomain.com
- 💬 Telegram: @YourTelegramUsername
- 🐛 Issues: [GitHub Issues](https://github.com/devstorm2576916/ethereum-mev-bot/issues)
- 📖 Documentation: [Full Docs](https://github.com/devstorm2576916/ethereum-mev-bot)

---

**⚠️ Disclaimer**: This bot is for educational purposes. Trading cryptocurrency involves substantial risk of loss. Use at your own risk.

