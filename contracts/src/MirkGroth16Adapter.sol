// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {IVerifier} from "./shielded/interfaces/IVerifier.sol";

/// @notice Adapts packed snarkjs proofs to a Mirk-generated immutable verifier.
contract MirkGroth16Adapter is IVerifier {
    address public immutable groth16;
    uint256 public immutable inputCount;
    bytes4 private immutable selector;

    constructor(address verifier_, uint256 count) {
        require(verifier_.code.length > 0 && count >= 3 && count <= 5);
        groth16 = verifier_;
        inputCount = count;
        if (count == 3) {
            selector = bytes4(keccak256("verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[3])"));
        } else if (count == 4) {
            selector = bytes4(keccak256("verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[4])"));
        } else {
            selector = bytes4(keccak256("verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[5])"));
        }
    }

    function verify(bytes calldata proof, uint256[] calldata inputs) external view returns (bool) {
        if (proof.length != 256 || inputs.length != inputCount) return false;
        // ABI static arrays have the same flat word encoding as proof || public inputs.
        bytes memory data = abi.encodePacked(selector, proof);
        for (uint256 i; i < inputs.length; ++i) {
            data = bytes.concat(data, bytes32(inputs[i]));
        }
        (bool ok, bytes memory result) = groth16.staticcall(data);
        return ok && result.length == 32 && abi.decode(result, (bool));
    }
}
