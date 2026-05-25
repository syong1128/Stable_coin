// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC3009Like {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/**
 * @title StableCafePayment
 * @notice 스테이블코인을 이용한 카페 결제 컨트랙트
 * @dev approve + pay 방식과 ERC-3009 서명 결제 방식을 모두 지원합니다.
 *
 * 역할:
 * - owner: 프랜차이즈 본사 역할, 토큰 화이트리스트/수수료/가맹점 주소 관리
 * - merchant: 실제 카페 사장 주소, 결제금액에서 수수료를 뺀 금액 수취
 * - customer: 스테이블코인으로 결제하는 사용자
 */
contract StableCafePayment is Ownable {
    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE_RATE = 1_000; // 최대 10%

    address public merchant;
    uint256 public feeRate; // basis points, 100 = 1%

    mapping(address => bool) public whitelistedTokens;

    event Paid(
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 fee,
        string method,
        uint256 timestamp
    );

    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event MerchantUpdated(address oldMerchant, address newMerchant);
    event Withdrawn(address indexed token, uint256 amount);

    constructor(address initialOwner, address initialMerchant, uint256 initialFeeRate)
        Ownable(initialOwner)
    {
        require(initialMerchant != address(0), "Payment: zero merchant");
        require(initialFeeRate <= MAX_FEE_RATE, "Payment: fee too high");

        merchant = initialMerchant;
        feeRate = initialFeeRate;
    }

    function pay(address token, uint256 amount) external {
        require(whitelistedTokens[token], "Payment: token not whitelisted");
        require(amount > 0, "Payment: zero amount");

        uint256 fee = (amount * feeRate) / FEE_DENOMINATOR;
        uint256 merchantAmount = amount - fee;

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).transfer(merchant, merchantAmount);

        emit Paid(msg.sender, token, amount, fee, "APPROVE_PAY", block.timestamp);
    }

    function payWithAuthorization(
        address token,
        uint256 amount,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(whitelistedTokens[token], "Payment: token not whitelisted");
        require(amount > 0, "Payment: zero amount");

        IERC3009Like(token).transferWithAuthorization(
            msg.sender,
            address(this),
            amount,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );

        uint256 fee = (amount * feeRate) / FEE_DENOMINATOR;
        uint256 merchantAmount = amount - fee;

        IERC20(token).transfer(merchant, merchantAmount);

        emit Paid(msg.sender, token, amount, fee, "ERC3009_AUTH", block.timestamp);
    }

    function addWhitelistedToken(address token) external onlyOwner {
        require(token != address(0), "Payment: zero token");
        whitelistedTokens[token] = true;
        emit TokenWhitelisted(token);
    }

    function removeWhitelistedToken(address token) external onlyOwner {
        whitelistedTokens[token] = false;
        emit TokenRemovedFromWhitelist(token);
    }

    function setMerchant(address newMerchant) external onlyOwner {
        require(newMerchant != address(0), "Payment: zero merchant");
        address oldMerchant = merchant;
        merchant = newMerchant;
        emit MerchantUpdated(oldMerchant, newMerchant);
    }

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "Payment: fee too high");
        uint256 oldRate = feeRate;
        feeRate = newFeeRate;
        emit FeeRateUpdated(oldRate, newFeeRate);
    }

    function withdrawFees(address token) external onlyOwner {
        uint256 amount = IERC20(token).balanceOf(address(this));
        require(amount > 0, "Payment: no fees");
        IERC20(token).transfer(owner(), amount);
        emit Withdrawn(token, amount);
    }
}
