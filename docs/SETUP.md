# Setup Guide: Running the MEV Bot Locally

This guide will walk you through setting up and running the Multi-Chain MEV Bot on your local computer for development, testing, or production.

## Prerequisites

1.  **Node.js & npm**: Install the latest LTS version (v20+ recommended) from [nodejs.org](https://nodejs.org/).
2.  **Git**: To clone the repository.
3.  **RPC Provider**: An account with [Alchemy](https://www.alchemy.com/), [Infura](https://www.infura.io/), or a similar provider. You'll need both HTTP and WebSocket (WSS) URLs.
4.  **Wallet**: A dedicated Ethereum-compatible wallet (Metamask/Rabby). **Never use your primary wallet for MEV bots.**

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ethereum-bnb-mev-bot

# Install dependencies
npm install
```

## Step 2: Configure Environment

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
```

Edit the `.env` file with your preferred text editor:

```env
# Chain Selection (e.g., ethereum, base, polygon, bsc)
CHAIN=ethereum
CHAIN_ID=1

# RPC Configuration (Get these from Alchemy/Infura)
RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
WSS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Your Dedicated MEV Wallet
PRIVATE_KEY=your_private_key_without_0x
WALLET_ADDRESS=0xYourWalletAddress

# Bot Logic
MIN_PROFIT_THRESHOLD=0.01
MAX_GAS_PRICE=100
MAX_TRADE_SIZE=1
CHECK_INTERVAL=1000
USE_FLASHBOTS=false
```

## Step 3: Compile and Deploy (Optional)

If you haven't deployed the arbitrage contract yet, or want to deploy your own:

```bash
# Compile the smart contracts
npx hardhat compile

# Deploy to your chosen network (ensure you have gas funds in your wallet)
npx hardhat run scripts/deploy.js --network mainnet
```

After deployment, update `ARBITRAGE_CONTRACT_ADDRESS` in your `.env`.

## Step 4: Perform a "Trial Run" (Highly Recommended)

Before running the bot with real funds, verify that your connection and simulation logic are working:

1.  Use a dummy private key (or one with 0 funds).
2.  Run the bot:
    ```bash
    npm start
    ```
3.  **Expected result**: The logs should show "🤖 ArbitrageBot started", followed by "👀 Starting price monitoring...". If an opportunity is found, you should see "🧪 Simulating transaction..." followed by an "insufficient funds" error. This confirms the bot is correctly identifying trades and attempting to simulate them on the real network.

## Step 5: Running for Production

For 24/7 operation, it's recommended to use PM2 (Process Manager 2):

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot for a specific chain
pm2 start src/index.js --name "mev-bot-eth"

# Or use the multi-instance manager (configured in ecosystem.config.js)
npm run start:multi
```

## Troubleshooting

-   **"Nonce too high"**: Your wallet has a pending transaction. Wait for it to clear or cancel it.
-   **"Replacement fee too low"**: The bot tried to send a transaction with the same nonce but lower gas. Check your `MAX_GAS_PRICE` settings.
-   **WebSocket Disconnects**: This is normal. The bot includes a `ConnectionManager` that will automatically reconnect.

---

### Security Note
**NEVER** share your `.env` file or commit it to GitHub. It contains your private key which gives full access to your funds.
