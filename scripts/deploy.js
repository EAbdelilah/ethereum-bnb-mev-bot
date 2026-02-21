/**
 * Deployment script for FlashloanArbitrage contract
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying FlashloanArbitrage contract...");
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", (await deployer.getBalance()).toString());
    
    // Contract addresses (Ethereum Mainnet)
    const AAVE_ADDRESS_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
    const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    const BALANCER_VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    const SKY_FLASH_MINTER = "0x60C96F604a4441738F98931109A545385960cc72";
    const ZEROX_PROXY = "0xDef1C0ded9bec7F1a1670819833240f027b25EfF";
    
    // Deploy contract
    const FlashloanArbitrage = await hre.ethers.getContractFactory("FlashloanArbitrage");
    const contract = await FlashloanArbitrage.deploy(
        AAVE_ADDRESS_PROVIDER,
        UNISWAP_V2_ROUTER,
        SUSHISWAP_ROUTER,
        UNISWAP_V3_ROUTER,
        BALANCER_VAULT,
        SKY_FLASH_MINTER,
        ZEROX_PROXY
    );
    
    await contract.deployed();
    
    console.log("✅ FlashloanArbitrage deployed to:", contract.address);
    console.log("");
    console.log("📋 Add this to your .env file:");
    console.log(`ARBITRAGE_CONTRACT_ADDRESS=${contract.address}`);
    console.log("");
    console.log("🔍 Verify contract on Etherscan:");
    console.log(`npx hardhat verify --network mainnet ${contract.address} ${AAVE_ADDRESS_PROVIDER} ${UNISWAP_V2_ROUTER} ${SUSHISWAP_ROUTER} ${UNISWAP_V3_ROUTER} ${BALANCER_VAULT} ${SKY_FLASH_MINTER} ${ZEROX_PROXY}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

