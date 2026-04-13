// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Staking {
    IERC20Minimal public immutable token;
    mapping(address => uint256) public staked;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "invalid token");
        token = IERC20Minimal(tokenAddress);
    }

    function stake(uint256 amount) external {
        require(amount > 0, "amount must be > 0");
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "transferFrom failed");

        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount must be > 0");
        require(staked[msg.sender] >= amount, "not enough staked");

        staked[msg.sender] -= amount;
        bool success = token.transfer(msg.sender, amount);
        require(success, "transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function getStakedBalance(address user) external view returns (uint256) {
        return staked[user];
    }

    function contractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
