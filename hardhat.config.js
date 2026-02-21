require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: (process.env.ETHEREUM_RPC_URL || process.env.RPC_URL) ? {
        url: process.env.ETHEREUM_RPC_URL || process.env.RPC_URL,
        blockNumber: 18000000
      } : undefined
    },
    // Ethereum networks
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1
    },
    mainnet: {
      url: process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1
    },
    goerli: {
      url: process.env.ETHEREUM_TESTNET_RPC_URL || process.env.ETHEREUM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5
    },
    sepolia: {
      url: process.env.ETHEREUM_TESTNET_RPC_URL || process.env.ETHEREUM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // BNB Chain networks
    bnb: {
      url: process.env.BNB_RPC_URL || process.env.RPC_URL || "https://bsc-dataseed.binance.org/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56
    },
    bsc: {
      url: process.env.BNB_RPC_URL || process.env.RPC_URL || "https://bsc-dataseed.binance.org/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56
    },
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || process.env.BNB_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97
    },
    bscTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || process.env.BNB_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

