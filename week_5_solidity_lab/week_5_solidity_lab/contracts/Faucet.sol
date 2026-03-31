// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Faucet {
    address public owner;
    uint256 public constant MAX_WITHDRAW_AMOUNT = 0.1 ether;
    uint256 public constant WITHDRAW_COOLDOWN = 1 days;

    mapping(address => uint256) public lastWithdrawTime;

    event Deposit(address indexed sender, uint256 amount, uint256 contractBalance);
    event Withdraw(address indexed receiver, uint256 amount, uint256 nextAvailableTime);
    event WithdrawAll(address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() payable {
        owner = msg.sender;
        if (msg.value > 0) {
            emit Deposit(msg.sender, msg.value, address(this).balance);
        }
    }

    receive() external payable {
        require(msg.value > 0, "Send ETH to deposit");
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    fallback() external payable {
        require(msg.value > 0, "Send ETH to deposit");
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getMyLastWithdrawTime() public view returns (uint256) {
        return lastWithdrawTime[msg.sender];
    }

    function getNextWithdrawTime(address user) public view returns (uint256) {
        uint256 lastTime = lastWithdrawTime[user];
        if (lastTime == 0) {
            return block.timestamp;
        }
        return lastTime + WITHDRAW_COOLDOWN;
    }

    function canWithdraw(address user) public view returns (bool) {
        return block.timestamp >= getNextWithdrawTime(user) && address(this).balance > 0;
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_WITHDRAW_AMOUNT, "Amount exceeds per-withdraw limit");
        require(address(this).balance >= amount, "Insufficient faucet balance");
        require(
            block.timestamp >= lastWithdrawTime[msg.sender] + WITHDRAW_COOLDOWN,
            "You must wait 24 hours before withdrawing again"
        );

        lastWithdrawTime[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(amount);

        emit Withdraw(msg.sender, amount, block.timestamp + WITHDRAW_COOLDOWN);
    }

    function withdrawAll() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No ETH to withdraw");

        payable(owner).transfer(amount);
        emit WithdrawAll(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
