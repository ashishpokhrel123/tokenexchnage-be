// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDC with 6 decimals
    }

    // Override decimals to match USDC (6 decimals)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Function to mint more tokens (for testing purposes)
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
