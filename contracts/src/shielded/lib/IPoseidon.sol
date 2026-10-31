// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Gloam. Derived source maintained by Mirk; see THIRD_PARTY_NOTICES.md.
pragma solidity ^0.8.24;

interface IPoseidon2 {
    function poseidon(uint256[2] memory input) external pure returns (uint256);
}

interface IPoseidon3 {
    function poseidon(uint256[3] memory input) external pure returns (uint256);
}
