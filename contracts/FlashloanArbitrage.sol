// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Balancer V2 interfaces
interface IFlashLoanRecipient {
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

interface IVault {
    function flashLoan(
        IFlashLoanRecipient recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

// Sky/MakerDAO (ERC3156) interfaces
interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

interface IERC3156FlashLender {
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}

/**
 * @title FlashloanArbitrage
 * @dev Advanced MEV bot contract for executing arbitrage opportunities using multi-provider flashloans (0% fee)
 * @notice This contract performs cross-DEX arbitrage with flashloans from Aave, Balancer, or Sky
 */
contract FlashloanArbitrage is FlashLoanSimpleReceiverBase, IFlashLoanRecipient, IERC3156FlashBorrower, Ownable {
    
    // State variables
    address public immutable uniswapV2Router;
    address public immutable sushiswapRouter;
    address public immutable uniswapV3Router;
    address public balancerVault;
    address public skyFlashMinter;
    address public zeroXExchangeProxy;
    
    uint256 public minProfitBasisPoints = 10; // 0.1% minimum profit
    uint256 public constant MAX_GAS_PRICE = 500 gwei;
    
    // Events
    event ArbitrageExecuted(
        address indexed token,
        uint256 profit,
        uint256 timestamp
    );
    
    event LiquidationExecuted(
        address indexed user,
        address indexed debtAsset,
        address indexed collateralAsset,
        uint256 profit
    );

    event UniswapXFilled(
        bytes32 indexed orderHash,
        address indexed filler,
        uint256 profit
    );

    event FlashLoanReceived(
        address indexed asset,
        uint256 amount,
        uint256 premium
    );
    
    event ProfitWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    
    // Errors
    error InsufficientProfit();
    error UnauthorizedCaller();
    error ArbitrageFailed();
    error InvalidParameters();
    
    /**
     * @dev Constructor
     * @param _addressProvider Aave lending pool address provider
     * @param _uniswapV2Router Uniswap V2 router address
     * @param _sushiswapRouter SushiSwap router address
     * @param _uniswapV3Router Uniswap V3 router address
     * @param _balancerVault Balancer V2 Vault address
     * @param _skyFlashMinter Sky/MakerDAO Flash Minter address
     */
    constructor(
        address _addressProvider,
        address _uniswapV2Router,
        address _sushiswapRouter,
        address _uniswapV3Router,
        address _balancerVault,
        address _skyFlashMinter,
        address _zeroXExchangeProxy
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) Ownable(msg.sender) {
        uniswapV2Router = _uniswapV2Router;
        sushiswapRouter = _sushiswapRouter;
        uniswapV3Router = _uniswapV3Router;
        balancerVault = _balancerVault;
        skyFlashMinter = _skyFlashMinter;
        zeroXExchangeProxy = _zeroXExchangeProxy;
    }
    
    enum FlashLoanProvider { Aave, Balancer, Sky }
    enum Strategy { Arbitrage, Liquidation, UniswapXFilling }

    /**
     * @dev Execute arbitrage or liquidation with flashloan from a specific provider
     * @param asset Token address to borrow
     * @param amount Amount to borrow
     * @param provider Flashloan provider (0: Aave, 1: Balancer, 2: Sky)
     * @param params Encoded parameters for arbitrage execution
     */
    function executeArbitrage(
        address asset,
        uint256 amount,
        FlashLoanProvider provider,
        bytes calldata params
    ) external onlyOwner {
        if (tx.gasprice > MAX_GAS_PRICE) revert InvalidParameters();
        
        if (provider == FlashLoanProvider.Aave) {
            POOL.flashLoanSimple(address(this), asset, amount, params, 0);
        } else if (provider == FlashLoanProvider.Balancer) {
            IERC20[] memory tokens = new IERC20[](1);
            tokens[0] = IERC20(asset);
            uint256[] memory amounts = new uint256[](1);
            amounts[0] = amount;
            IVault(balancerVault).flashLoan(this, tokens, amounts, params);
        } else if (provider == FlashLoanProvider.Sky) {
            IERC3156FlashLender(skyFlashMinter).flashLoan(this, asset, amount, params);
        }
    }
    
    /**
     * @dev Callback for Aave V3
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(POOL)) revert UnauthorizedCaller();
        return _handleFlashLoan(asset, amount, premium, params);
    }

    /**
     * @dev Callback for Balancer V2
     */
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        if (msg.sender != balancerVault) revert UnauthorizedCaller();
        _handleFlashLoan(address(tokens[0]), amounts[0], feeAmounts[0], userData);
        // Repay Balancer
        IERC20(tokens[0]).transfer(balancerVault, amounts[0] + feeAmounts[0]);
    }

    /**
     * @dev Callback for Sky/MakerDAO (ERC3156)
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        if (msg.sender != skyFlashMinter) revert UnauthorizedCaller();
        _handleFlashLoan(token, amount, fee, data);
        // Approve repayment
        IERC20(token).approve(skyFlashMinter, amount + fee);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    /**
     * @dev Common logic to handle flashloan and execute strategy
     */
    function _handleFlashLoan(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes memory params
    ) internal returns (bool) {
        emit FlashLoanReceived(asset, amount, premium);
        
        (Strategy strategy, bytes memory strategyData) = abi.decode(params, (Strategy, bytes));

        uint256 finalAmount;

        if (strategy == Strategy.Arbitrage) {
            finalAmount = _handleArbitrage(asset, amount, strategyData);
        } else if (strategy == Strategy.Liquidation) {
            finalAmount = _handleLiquidation(asset, amount, strategyData);
        } else if (strategy == Strategy.UniswapXFilling) {
            finalAmount = _handleUniswapXFilling(asset, amount, strategyData);
        }

        // Calculate profit
        uint256 totalDebt = amount + premium;
        if (finalAmount <= totalDebt) revert InsufficientProfit();

        uint256 profit = finalAmount - totalDebt;

        // For Aave, we need to approve POOL to pull the debt
        if (msg.sender == address(POOL)) {
            IERC20(asset).approve(address(POOL), totalDebt);
        }

        return true;
    }

    /**
     * @dev Internal handler for UniswapX Filling strategy
     */
    function _handleUniswapXFilling(
        address assetIn,
        uint256 amountIn,
        bytes memory strategyData
    ) internal returns (uint256) {
        (
            address reactor,
            bytes memory reactorData,
            address targetHedge,
            bytes memory hedgeData,
            address assetOut
        ) = abi.decode(strategyData, (address, bytes, address, bytes, address));

        // 1. Approve Reactor
        IERC20(assetIn).approve(reactor, amountIn);

        // 2. Execute UniswapX Fill
        (bool success, ) = reactor.call(reactorData);
        if (!success) revert ArbitrageFailed();

        // 3. Hedge assetOut back to assetIn using 0x or other target
        uint256 amountOut = IERC20(assetOut).balanceOf(address(this));
        IERC20(assetOut).approve(targetHedge, amountOut);

        (bool hedgeSuccess, ) = targetHedge.call(hedgeData);
        if (!hedgeSuccess) revert ArbitrageFailed();

        uint256 finalAmount = IERC20(assetIn).balanceOf(address(this));

        emit UniswapXFilled(keccak256(reactorData), msg.sender, finalAmount > amountIn ? finalAmount - amountIn : 0);
        return finalAmount;
    }

    /**
     * @dev Internal handler for arbitrage strategy
     */
    function _handleArbitrage(
        address asset,
        uint256 amount,
        bytes memory strategyData
    ) internal returns (uint256) {
        (
            address[] memory path,
            address[] memory routers,
            uint24[] memory fees,
            bool useV3
        ) = abi.decode(strategyData, (address[], address[], uint24[], bool));
        
        uint256 finalAmount = _executeArbitrageTrades(
            asset,
            amount,
            path,
            routers,
            fees,
            useV3
        );
        
        uint256 minProfit = (amount * minProfitBasisPoints) / 10000;
        if (finalAmount < amount + minProfit) revert InsufficientProfit();
        
        emit ArbitrageExecuted(asset, finalAmount - amount, block.timestamp);
        return finalAmount;
    }

    /**
     * @dev Internal handler for liquidation strategy
     */
    function _handleLiquidation(
        address debtAsset,
        uint256 amount,
        bytes memory strategyData
    ) internal returns (uint256) {
        (
            address collateralAsset,
            address user,
            address[] memory swapPath,
            address[] memory routers,
            uint24[] memory fees,
            bool useV3
        ) = abi.decode(strategyData, (address, address, address[], address[], uint24[], bool));

        // 1. Approve Pool to spend debtAsset
        IERC20(debtAsset).approve(address(POOL), amount);

        // 2. Execute Liquidation
        POOL.liquidationCall(collateralAsset, debtAsset, user, amount, false);

        // 3. Get collateral balance
        uint256 collateralBalance = IERC20(collateralAsset).balanceOf(address(this));
        
        // 4. Swap collateral back to debtAsset
        uint256 finalAmount = _executeArbitrageTrades(
            collateralAsset,
            collateralBalance,
            swapPath,
            routers,
            fees,
            useV3
        );

        emit LiquidationExecuted(user, debtAsset, collateralAsset, finalAmount > amount ? finalAmount - amount : 0);
        return finalAmount;
    }
    
    /**
     * @dev Internal function to execute arbitrage trades across DEXes
     */
    function _executeArbitrageTrades(
        address asset,
        uint256 amount,
        address[] memory path,
        address[] memory routers,
        uint24[] memory fees,
        bool useV3
    ) internal returns (uint256) {
        uint256 currentAmount = amount;
        
        for (uint256 i = 0; i < routers.length; i++) {
            if (useV3 && i == routers.length - 1) {
                // Use Uniswap V3 for last swap
                currentAmount = _swapV3(
                    path[i],
                    path[i + 1],
                    currentAmount,
                    fees[i],
                    routers[i]
                );
            } else {
                // Use Uniswap V2 compatible router
                currentAmount = _swapV2(
                    path[i],
                    path[i + 1],
                    currentAmount,
                    routers[i]
                );
            }
        }
        
        return currentAmount;
    }
    
    /**
     * @dev Swap tokens using Uniswap V2 compatible router
     */
    function _swapV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(router, amountIn);
        
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenIn;
        swapPath[1] = tokenOut;
        
        uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount (slippage handled by profit check)
            swapPath,
            address(this),
            block.timestamp + 300
        );
        
        return amounts[amounts.length - 1];
    }
    
    /**
     * @dev Swap tokens using Uniswap V3 router
     */
    function _swapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee,
        address router
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(router, amountIn);
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        
        return IUniswapV3Router(router).exactInputSingle(params);
    }
    
    /**
     * @dev Withdraw profits to owner
     */
    function withdrawProfits(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
        emit ProfitWithdrawn(token, amount, owner());
    }
    
    /**
     * @dev Update minimum profit threshold
     */
    function setMinProfitBasisPoints(uint256 _minProfit) external onlyOwner {
        minProfitBasisPoints = _minProfit;
    }

    /**
     * @dev Update 0x Exchange Proxy address
     */
    function setZeroXExchangeProxy(address _zeroXExchangeProxy) external onlyOwner {
        zeroXExchangeProxy = _zeroXExchangeProxy;
    }
    
    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
        }
    }
    
    /**
     * @dev Get token balance of contract
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // Receive ETH
    receive() external payable {}
}

