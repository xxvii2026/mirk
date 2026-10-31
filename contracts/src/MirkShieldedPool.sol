// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IncrementalMerkleTreePoseidon as IMT} from "./shielded/lib/IncrementalMerkleTreePoseidon.sol";
import {IPoseidon2} from "./shielded/lib/IPoseidon.sol";
import {IVerifier} from "./shielded/interfaces/IVerifier.sol";

interface IMirkToken {
    function balanceOf(address) external view returns (uint256);
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice Mirk's payments-only testnet pool. Immutable verifiers; no owner, upgrade, fees or sweep.
/// @dev Deploy with Mirk-generated keys, never a verifier that accepts mock proofs.
contract MirkShieldedPool {
    using IMT for IMT.Tree;
    uint256 public constant FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    IVerifier public immutable shieldVerifier;
    IVerifier public immutable transferVerifier;
    IVerifier public immutable unshieldVerifier;
    IMT.Tree private tree;
    mapping(bytes32 => bool) public isSpent;
    mapping(bytes32 => bool) public commitmentSeen;
    mapping(address => uint256) public deposited;
    mapping(address => bool) public assetAllowed;
    bool private entered;

    event Shielded(
        bytes32 indexed commitment,
        address indexed asset,
        uint256 amount,
        uint256 leafIndex,
        address indexed from
    );
    event Transferred(bytes32 indexed nullifier, bytes32[2] newCommitments);
    event Unshielded(bytes32 indexed nullifier, address indexed asset, address indexed to, uint256 amount);
    error InvalidConfiguration();
    error InvalidProof();
    error InvalidAmount();
    error InvalidValue();
    error InvalidField();
    error UnknownRoot();
    error AlreadySpent();
    error DuplicateCommitment();
    error TransferFailed();
    error UnsupportedAsset();
    error Reentrancy();

    constructor(
        address poseidon,
        address shield_,
        address transfer_,
        address unshield_,
        address[] memory assets
    ) {
        if (block.chainid != 46630 && block.chainid != 31337) {
            revert InvalidConfiguration();
        }
        if (
            poseidon.code.length == 0 || shield_.code.length == 0 || transfer_.code.length == 0
                || unshield_.code.length == 0
        ) revert InvalidConfiguration();
        shieldVerifier = IVerifier(shield_);
        transferVerifier = IVerifier(transfer_);
        unshieldVerifier = IVerifier(unshield_);
        tree.initialize(IPoseidon2(poseidon));
        for (uint256 i; i < assets.length; ++i) {
            if (assets[i] != address(0) && assets[i].code.length == 0) revert InvalidConfiguration();
            assetAllowed[assets[i]] = true;
        }
    }
    modifier nonReentrant() {
        if (entered) revert Reentrancy();
        entered = true;
        _;
        entered = false;
    }

    function currentRoot() external view returns (bytes32) {
        return bytes32(tree.currentRoot);
    }

    function nextIndex() external view returns (uint256) {
        return tree.nextIndex;
    }

    function isKnownRoot(bytes32 root) external view returns (bool) {
        return tree.isKnownRoot(uint256(root));
    }

    function _field(bytes32 value) private pure {
        if (value == bytes32(0) || uint256(value) >= FIELD) revert InvalidField();
    }

    function _insert(bytes32 commitment) private returns (uint256) {
        _field(commitment);
        if (commitmentSeen[commitment]) revert DuplicateCommitment();
        commitmentSeen[commitment] = true;
        return tree.insert(uint256(commitment));
    }

    function shieldBound(address asset, uint256 amount, bytes32 commitment, bytes calldata proof)
        external
        payable
        nonReentrant
    {
        if (!assetAllowed[asset]) revert UnsupportedAsset();
        if (amount == 0 || amount >= 1 << 128) revert InvalidAmount();
        _field(commitment);
        uint256[] memory inputs = new uint256[](3);
        inputs[0] = uint256(commitment);
        inputs[1] = amount;
        inputs[2] = uint160(asset);
        if (!shieldVerifier.verify(proof, inputs)) revert InvalidProof();
        if (asset == address(0)) {
            if (msg.value != amount) revert InvalidValue();
        } else {
            if (msg.value != 0) revert InvalidValue();
            uint256 beforeBalance = IMirkToken(asset).balanceOf(address(this));
            _tokenCall(asset, abi.encodeCall(IMirkToken.transferFrom, (msg.sender, address(this), amount)));
            if (IMirkToken(asset).balanceOf(address(this)) - beforeBalance != amount) revert InvalidValue();
        }
        deposited[asset] += amount;
        uint256 index = _insert(commitment);
        emit Shielded(commitment, asset, amount, index, msg.sender);
    }

    function _spend(bytes32 root, bytes32 nullifier) private {
        _field(nullifier);
        if (!tree.isKnownRoot(uint256(root))) revert UnknownRoot();
        if (isSpent[nullifier]) revert AlreadySpent();
        isSpent[nullifier] = true;
    }

    function transfer(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        bytes32[2] calldata newCommitments
    ) external nonReentrant {
        _spend(root, nullifier);
        uint256[] memory inputs = new uint256[](4);
        inputs[0] = uint256(root);
        inputs[1] = uint256(nullifier);
        inputs[2] = uint256(newCommitments[0]);
        inputs[3] = uint256(newCommitments[1]);
        if (!transferVerifier.verify(proof, inputs)) revert InvalidProof();
        _insert(newCommitments[0]);
        _insert(newCommitments[1]);
        emit Transferred(nullifier, newCommitments);
    }

    function unshield(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address asset,
        address to,
        uint256 amount
    ) external nonReentrant {
        if (to == address(0) || to == address(this)) revert InvalidConfiguration();
        if (amount == 0 || amount >= 1 << 128 || amount > deposited[asset]) revert InvalidAmount();
        _spend(root, nullifier);
        uint256[] memory inputs = new uint256[](5);
        inputs[0] = uint256(root);
        inputs[1] = uint256(nullifier);
        inputs[2] = uint160(asset);
        inputs[3] = amount;
        inputs[4] = uint160(to);
        if (!unshieldVerifier.verify(proof, inputs)) revert InvalidProof();
        deposited[asset] -= amount;
        if (asset == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            _tokenCall(asset, abi.encodeCall(IMirkToken.transfer, (to, amount)));
        }
        emit Unshielded(nullifier, asset, to, amount);
    }

    function _tokenCall(address asset, bytes memory data) private {
        (bool ok, bytes memory result) = asset.call(data);
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TransferFailed();
    }
}
