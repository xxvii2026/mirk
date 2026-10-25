// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title MirkAccountRegistry
/// @notice Maps 12-digit MIRK account numbers to Gloam receive tags.
/// @dev Holds no funds, names, wallet addresses, balances or profile data. A registration is
///      permanent: nobody, including the owner, can edit or remove it. The owner can only rotate
///      the registrar address that is allowed to add new registrations.
contract MirkAccountRegistry {
    /// @notice Largest 12-digit account number.
    uint64 public constant MAX_ACCOUNT_NUMBER = 999_999_999_999;
    /// @notice Upper bound on a receive tag's length, in bytes.
    uint256 public constant MAX_TAG_LENGTH = 256;

    address public owner;
    address public registrar;

    mapping(uint64 accountNumber => bytes receiveTag) private _tagOf;
    mapping(bytes32 receiveTagHash => uint64 accountNumber) private _accountOfTagHash;

    event AccountRegistered(uint64 indexed accountNumber, bytes32 indexed receiveTagHash, bytes receiveTag);
    event RegistrarUpdated(address indexed previousRegistrar, address indexed newRegistrar);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotRegistrar();
    error ZeroAddress();
    error InvalidAccountNumber();
    error InvalidReceiveTag();
    error AccountAlreadyRegistered();
    error ReceiveTagAlreadyRegistered();

    constructor(address initialOwner, address initialRegistrar) {
        if (initialOwner == address(0) || initialRegistrar == address(0)) revert ZeroAddress();
        owner = initialOwner;
        registrar = initialRegistrar;
        emit OwnershipTransferred(address(0), initialOwner);
        emit RegistrarUpdated(address(0), initialRegistrar);
    }

    /// @notice Register a new account number. Only the registrar can call this.
    function register(uint64 accountNumber, bytes calldata receiveTag) external {
        if (msg.sender != registrar) revert NotRegistrar();
        if (!isValidAccountNumber(accountNumber)) revert InvalidAccountNumber();
        if (receiveTag.length == 0 || receiveTag.length > MAX_TAG_LENGTH) revert InvalidReceiveTag();
        if (_tagOf[accountNumber].length != 0) revert AccountAlreadyRegistered();

        bytes32 tagHash = keccak256(receiveTag);
        if (_accountOfTagHash[tagHash] != 0) revert ReceiveTagAlreadyRegistered();

        _tagOf[accountNumber] = receiveTag;
        _accountOfTagHash[tagHash] = accountNumber;
        emit AccountRegistered(accountNumber, tagHash, receiveTag);
    }

    /// @notice The receive tag registered for `accountNumber`, or empty bytes if none.
    function receiveTagOf(uint64 accountNumber) external view returns (bytes memory) {
        return _tagOf[accountNumber];
    }

    /// @notice The account number registered for a receive tag hash, or 0 if none.
    function accountOfTagHash(bytes32 receiveTagHash) external view returns (uint64) {
        return _accountOfTagHash[receiveTagHash];
    }

    function isRegistered(uint64 accountNumber) external view returns (bool) {
        return _tagOf[accountNumber].length != 0;
    }

    /// @notice Non-zero, at most 12 digits, with a valid Luhn check digit.
    function isValidAccountNumber(uint64 accountNumber) public pure returns (bool) {
        if (accountNumber == 0 || accountNumber > MAX_ACCOUNT_NUMBER) return false;
        uint256 sum;
        uint256 n = accountNumber;
        // Walk the 12 digits from the right; every second digit (from the check digit) doubles.
        for (uint256 i = 0; i < 12; ++i) {
            uint256 d = n % 10;
            n /= 10;
            if (i % 2 == 1) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
        }
        return sum % 10 == 0;
    }

    function setRegistrar(address newRegistrar) external {
        if (msg.sender != owner) revert NotOwner();
        if (newRegistrar == address(0)) revert ZeroAddress();
        emit RegistrarUpdated(registrar, newRegistrar);
        registrar = newRegistrar;
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
