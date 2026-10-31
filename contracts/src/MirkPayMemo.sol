// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IMirkCommitments {
    function commitmentSeen(bytes32) external view returns (bool);
}

/// @notice Encrypted discovery messages for confirmed Mirk payments. Holds no funds.
contract MirkPayMemo {
    IMirkCommitments public immutable pool;
    mapping(bytes32 => mapping(bytes32 => bool)) public posted;
    event PaymentMemo(bytes32 indexed paymentCommitment, bytes memo);
    error InvalidMemo();

    constructor(address pool_) {
        require(pool_.code.length > 0);
        pool = IMirkCommitments(pool_);
    }

    function postMemo(bytes32 paymentCommitment, bytes calldata memo) external {
        if (memo.length == 0 || memo.length > 2048 || !pool.commitmentSeen(paymentCommitment)) {
            revert InvalidMemo();
        }
        bytes32 digest = keccak256(memo);
        if (posted[paymentCommitment][digest]) revert InvalidMemo();
        posted[paymentCommitment][digest] = true;
        emit PaymentMemo(paymentCommitment, memo);
    }
}
