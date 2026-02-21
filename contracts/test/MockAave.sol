// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAavePool {
    function liquidationCall(address, address, address, uint256, bool) external {}
    receive() external payable {}
}

contract MockPoolAddressesProvider {
    address pool;
    constructor(address _pool) {
        pool = _pool;
    }
    function getPool() external view returns (address) {
        return pool;
    }
}
