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

    // Deploy FlashloanArbitrage
    const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
    flashloanArbitrage = await FlashloanArbitrage.deploy(
      mockAavePool.address,
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

    expect(finalBalance.sub(initialBalance).toString()).to.equal(amount.toString());
  });

  it("Should fail if unauthorized caller tries to withdraw", async function () {
    try {
      await flashloanArbitrage.connect(addr1).withdrawProfits(mockToken.address, 100);
      expect.fail("Expected transaction to be reverted");
    } catch (error) {
      expect(error.message).to.contain("OwnableUnauthorizedAccount");
    }
  });

  describe("receiveFlashLoan (Balancer)", function () {
    it("Should execute arbitrage successfully", async function () {
      const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
      const mockRouter = await MockUniswapRouter.deploy();
      await mockRouter.deployed();

      const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
      const fa = await FlashloanArbitrage.deploy(
        mockAavePool.address,
        mockRouter.address,
        mockRouter.address,
        mockRouter.address,
        owner.address, // mock balancer vault
        owner.address,
        owner.address
      );
      await fa.deployed();

      const asset = mockToken.address;
      const amount = ethers.utils.parseEther("1");

      const strategy = 1; // SpatialArbitrage
      const strategyData = ethers.utils.defaultAbiCoder.encode(
        ["address[]", "address[]", "uint24[]", "bool"],
        [[asset, asset, asset], [mockRouter.address, mockRouter.address], [3000, 3000], false]
      );

      const params = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [strategy, strategyData]
      );

      await mockToken.mint(fa.address, amount.add(1000));

      const tx = await fa.connect(owner).receiveFlashLoan(
        [mockToken.address],
        [amount],
        [0],
        params
      );
      await tx.wait();
    });
  });

  describe("onFlashLoan (Sky)", function () {
    it("Should execute liquidation successfully", async function () {
      const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
      const mockRouter = await MockUniswapRouter.deploy();
      await mockRouter.deployed();

      const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
      const fa = await FlashloanArbitrage.deploy(
        mockAavePool.address,
        mockRouter.address,
        mockRouter.address,
        mockRouter.address,
        owner.address,
        owner.address, // mock sky flash minter
        owner.address
      );
      await fa.deployed();

      const asset = mockToken.address;
      const collateral = mockToken.address;
      const amount = ethers.utils.parseEther("1");

      const strategy = 2; // Liquidation
      const strategyData = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address[]", "address[]", "uint24[]", "bool"],
        [collateral, addr1.address, [collateral, asset], [mockRouter.address], [3000], false]
      );

      const params = ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes"],
        [strategy, strategyData]
      );

      await mockToken.mint(fa.address, amount.add(ethers.utils.parseEther("1")));

      const tx = await fa.connect(owner).onFlashLoan(
        owner.address,
        asset,
        amount,
        0,
        params
      );
      await tx.wait();
    });

    it("Should execute Mirroring (RFQ) successully", async function () {
        const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
        const fa = await FlashloanArbitrage.deploy(
          mockAavePool.address,
          owner.address,
          owner.address,
          owner.address,
          owner.address,
          owner.address,
          owner.address
        );
        await fa.deployed();

        const asset = mockToken.address;
        const amount = ethers.utils.parseEther("1");

        const strategy = 0; // MirroringRFQ
        // strategyData: (address reactor, bytes reactorData, address targetHedge, bytes hedgeData, address assetOut)
        const strategyData = ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes", "address", "bytes", "address"],
          [owner.address, "0x", owner.address, "0x", asset]
        );

        const params = ethers.utils.defaultAbiCoder.encode(
          ["uint8", "bytes"],
          [strategy, strategyData]
        );

        await mockToken.mint(fa.address, amount.add(1000));

        const tx = await fa.connect(owner).receiveFlashLoan(
          [asset],
          [amount],
          [0],
          params
        );
        await tx.wait();
      });
  });
});
