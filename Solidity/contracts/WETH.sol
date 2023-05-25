// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor(
        string memory name,
        string memory _symbol
    ) ERC20(name, _symbol) {
        _mint(msg.sender, 1000 ether);
    }

    function mint() public {
        _mint(msg.sender, 1000 ether);
    }
}
