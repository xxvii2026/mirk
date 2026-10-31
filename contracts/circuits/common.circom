pragma circom 2.1.6;
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

// Mirk v1: BN254, Poseidon(secret, amount, asset), depth-20 Poseidon tree.
// Amounts are 128-bit integers; range constraints prevent field-wrap inflation.
template Note() {
    signal input secret;
    signal input amount;
    signal input asset;
    signal output commitment;
    component valueBits = Num2Bits(128); valueBits.in <== amount;
    component assetBits = Num2Bits(160); assetBits.in <== asset;
    component zeroSecret = IsZero(); zeroSecret.in <== secret; zeroSecret.out === 0;
    component h = Poseidon(3);
    h.inputs[0] <== secret; h.inputs[1] <== amount; h.inputs[2] <== asset;
    commitment <== h.out;
}
template Nullifier() {
    signal input secret;
    signal input commitment;
    signal output hash;
    component h = Poseidon(2);
    h.inputs[0] <== secret; h.inputs[1] <== commitment;
    hash <== h.out;
}
template Membership() {
    signal input leaf;
    signal input root;
    signal input pathElements[20];
    signal input pathIndices[20];
    signal nodes[21];
    component hashes[20];
    nodes[0] <== leaf;
    for (var i = 0; i < 20; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        hashes[i] = Poseidon(2);
        hashes[i].inputs[0] <== nodes[i] + pathIndices[i] * (pathElements[i] - nodes[i]);
        hashes[i].inputs[1] <== pathElements[i] + pathIndices[i] * (nodes[i] - pathElements[i]);
        nodes[i+1] <== hashes[i].out;
    }
    nodes[20] === root;
}
