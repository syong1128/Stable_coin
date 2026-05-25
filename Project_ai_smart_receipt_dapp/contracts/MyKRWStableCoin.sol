// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MyKRWStableCoin
 * @notice GIWA Sepolia 과제용 나만의 원화형 스테이블코인
 * @dev ERC20 + Permit(EIP-2612) + ERC-3009 일부 기능 + Minter + Pause + Blacklist
 *
 * 과제 의도:
 * - 실제 USDC처럼 "허가된 minter만 발행"할 수 있게 구성
 * - DApp 결제 컨트랙트가 approve 방식과 서명 방식으로 모두 상호작용 가능
 * - GIWA 체인 위에서 배포 가능한 EVM 표준 Solidity 컨트랙트
 */
contract MyKRWStableCoin is ERC20, ERC20Permit, Ownable, Pausable {
    using ECDSA for bytes32;

    uint8 private constant TOKEN_DECIMALS = 6;

    address public pauser;
    address public rescuer;

    mapping(address => bool) public isMinter;
    mapping(address => uint256) public minterAllowance;
    mapping(address => bool) public isBlacklisted;

    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256(
            "CancelAuthorization(address authorizer,bytes32 nonce)"
        );

    event MinterConfigured(address indexed minter, uint256 allowance);
    event MinterRemoved(address indexed minter);
    event Mint(address indexed minter, address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 amount);

    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    event PauserChanged(address indexed newPauser);
    event RescuerChanged(address indexed newRescuer);

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    modifier onlyPauser() {
        require(msg.sender == pauser, "MyKRW: caller is not pauser");
        _;
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender], "MyKRW: caller is not minter");
        _;
    }

    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "MyKRW: blacklisted address");
        _;
    }

    constructor(address initialOwner)
        ERC20("My Korean Won Stable Coin", "mKRW")
        ERC20Permit("My Korean Won Stable Coin")
        Ownable(initialOwner)
    {
        pauser = initialOwner;
        rescuer = initialOwner;
    }

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    function configureMinter(address minter, uint256 allowance_) external onlyOwner {
        require(minter != address(0), "MyKRW: zero minter");
        isMinter[minter] = true;
        minterAllowance[minter] = allowance_;
        emit MinterConfigured(minter, allowance_);
    }

    function removeMinter(address minter) external onlyOwner {
        isMinter[minter] = false;
        minterAllowance[minter] = 0;
        emit MinterRemoved(minter);
    }

    function mint(address to, uint256 amount)
        external
        onlyMinter
        notBlacklisted(to)
    {
        require(amount <= minterAllowance[msg.sender], "MyKRW: minter allowance exceeded");
        minterAllowance[msg.sender] -= amount;
        _mint(to, amount);
        emit Mint(msg.sender, to, amount);
    }

    function burn(uint256 amount) external notBlacklisted(msg.sender) {
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    function blacklist(address account) external onlyOwner {
        isBlacklisted[account] = true;
        emit Blacklisted(account);
    }

    function unBlacklist(address account) external onlyOwner {
        isBlacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    function pause() external onlyPauser {
        _pause();
    }

    function unpause() external onlyPauser {
        _unpause();
    }

    function updatePauser(address newPauser) external onlyOwner {
        require(newPauser != address(0), "MyKRW: zero pauser");
        pauser = newPauser;
        emit PauserChanged(newPauser);
    }

    function updateRescuer(address newRescuer) external onlyOwner {
        require(newRescuer != address(0), "MyKRW: zero rescuer");
        rescuer = newRescuer;
        emit RescuerChanged(newRescuer);
    }

    /**
     * @notice ERC-3009 방식: approve 없이 서명으로 토큰 전송
     */
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
    )
        external
        whenNotPaused
        notBlacklisted(from)
        notBlacklisted(to)
    {
        require(block.timestamp > validAfter, "MyKRW: authorization not yet valid");
        require(block.timestamp < validBefore, "MyKRW: authorization expired");
        require(!authorizationState[from][nonce], "MyKRW: authorization used");

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from, "MyKRW: invalid signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice ERC-3009 방식: 수신자(to)가 직접 호출해야 하는 서명 결제
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        whenNotPaused
        notBlacklisted(from)
        notBlacklisted(to)
    {
        require(msg.sender == to, "MyKRW: caller must be payee");
        require(block.timestamp > validAfter, "MyKRW: authorization not yet valid");
        require(block.timestamp < validBefore, "MyKRW: authorization expired");
        require(!authorizationState[from][nonce], "MyKRW: authorization used");

        bytes32 structHash = keccak256(
            abi.encode(
                RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from, "MyKRW: invalid signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!authorizationState[authorizer][nonce], "MyKRW: authorization already used");

        bytes32 structHash = keccak256(
            abi.encode(
                CANCEL_AUTHORIZATION_TYPEHASH,
                authorizer,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == authorizer, "MyKRW: invalid signature");

        authorizationState[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    function rescueERC20(IERC20 token, address to, uint256 amount) external {
        require(msg.sender == rescuer, "MyKRW: caller is not rescuer");
        require(to != address(0), "MyKRW: zero receiver");
        require(token.transfer(to, amount), "MyKRW: rescue failed");
    }

    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        if (from != address(0)) {
            require(!isBlacklisted[from], "MyKRW: sender blacklisted");
        }
        if (to != address(0)) {
            require(!isBlacklisted[to], "MyKRW: receiver blacklisted");
        }
        super._update(from, to, value);
    }
}
