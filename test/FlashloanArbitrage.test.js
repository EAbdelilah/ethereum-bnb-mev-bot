const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("FlashloanArbitrage", function () {
  let flashloanArbitrage;
  let owner;
  let addr1;
  let mockAavePool;
  let mockUniswapV2Router;
  let mockUniswapV3Router;
  let mockBalancerVault;
  let mockSkyFlashMinter;
  let mockToken;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock contracts
    const TestToken = await ethers.getContractFactory("TestERC20");
    mockToken = await TestToken.deploy("Test", "TST", 18);
    await mockToken.deployed();

    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockAavePool = await MockAavePool.deploy();
    await mockAavePool.deployed();

    const MockPoolAddressesProvider = await ethers.getContractFactory("MockPoolAddressesProvider");
    const mockProvider = await MockPoolAddressesProvider.deploy(mockAavePool.address);
    await mockProvider.deployed();

    // Deploy FlashloanArbitrage
    const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
    flashloanArbitrage = await FlashloanArbitrage.deploy(
      mockProvider.address,
      owner.address, // _uniswapV2Router (mock)
      owner.address, // _sushiswapRouter (mock)
      owner.address, // _uniswapV3Router (mock)
      owner.address, // _balancerVault (mock)
      owner.address, // _skyFlashMinter (mock)
      owner.address  // _zeroXExchangeProxy (mock)
    );
    await flashloanArbitrage.deployed();
  });

  it("Should set the correct owner", async function () {
    expect(await flashloanArbitrage.owner()).to.equal(owner.address);
  });

  it("Should allow owner to withdraw profits", async function () {
    const amount = ethers.utils.parseEther("1");
    await mockToken.mint(flashloanArbitrage.address, amount);

    const initialBalance = await mockToken.balanceOf(owner.address);
    await flashloanArbitrage.withdrawProfits(mockToken.address, amount);
    const finalBalance = await mockToken.balanceOf(owner.address);

    expect(finalBalance.sub(initialBalance)).to.equal(amount);
  });

  it("Should fail if unauthorized caller tries to withdraw", async function () {
    await expect(
      flashloanArbitrage.connect(addr1).withdrawProfits(mockToken.address, 100)
    ).to.be.revertedWith("OwnableUnauthorizedAccount");
  });

  describe("executeOperation", function () {
    it("Should execute arbitrage successfully", async function () {
      const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
      const mockRouter = await MockUniswapRouter.deploy();
      await mockRouter.deployed();

      // Redploy with real mock router
      const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
      const MockPoolAddressesProvider = await ethers.getContractFactory("MockPoolAddressesProvider");
      const mockProvider = await MockPoolAddressesProvider.deploy(mockAavePool.address);
      await mockProvider.deployed();

      const fa = await FlashloanArbitrage.deploy(
        mockProvider.address,
        mockRouter.address,
        mockRouter.address,
        mockRouter.address,
        owner.address,
        owner.address,
        owner.address
      );
      await fa.deployed();

      const asset = mockToken.address;
      const amount = ethers.utils.parseEther("1");
      const premium = 0;

      const strategy = 0; // Arbitrage
      const strategyData = ethers.utils.defaultAbiCoder.encode(
        ["address[]", "address[]", "uint24[]", "bool"],
        [[asset, asset, asset], [mockRouter.address, mockRouter.address], [3000, 3000], false]
      );

      const params = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [strategy, strategyData]
      );

      // Give fa some tokens to cover debt if needed (though mock router gives profit)
      await mockToken.mint(fa.address, amount.add(1000));

      // Impersonate POOL
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [mockAavePool.address],
      });
      const poolSigner = await ethers.getSigner(mockAavePool.address);

      // Ensure poolSigner has some ETH for gas
      await owner.sendTransaction({
        to: mockAavePool.address,
        value: ethers.utils.parseEther("1")
      });

      await expect(fa.connect(poolSigner).executeOperation(
        asset,
        amount,
        premium,
        owner.address,
        params
      )).to.not.be.reverted;
    });

    it("Should execute liquidation successfully", async function () {
      const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
      const mockRouter = await MockUniswapRouter.deploy();
      await mockRouter.deployed();

      const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
      const MockPoolAddressesProvider = await ethers.getContractFactory("MockPoolAddressesProvider");
      const mockProvider = await MockPoolAddressesProvider.deploy(mockAavePool.address);
      await mockProvider.deployed();

      const fa = await FlashloanArbitrage.deploy(
        mockProvider.address,
        mockRouter.address,
        mockRouter.address,
        mockRouter.address,
        owner.address,
        owner.address,
        owner.address
      );
      await fa.deployed();

      const asset = mockToken.address;
      const collateral = mockToken.address;
      const amount = ethers.utils.parseEther("1");

      const strategy = 1; // Liquidation
      const strategyData = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address[]", "address[]", "uint24[]", "bool"],
        [collateral, addr1.address, [collateral, asset], [mockRouter.address], [3000], false]
      );

      const params = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [strategy, strategyData]
      );

      await mockToken.mint(fa.address, amount.add(ethers.utils.parseEther("1")));

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [mockAavePool.address],
      });
      const poolSigner = await ethers.getSigner(mockAavePool.address);

      await expect(fa.connect(poolSigner).executeOperation(
        asset,
        amount,
        0,
        owner.address,
        params
      )).to.not.be.reverted;
    });
  });
});
