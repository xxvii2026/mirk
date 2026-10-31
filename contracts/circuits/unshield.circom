pragma circom 2.1.6;
include "common.circom";
template Unshield() {
    signal input root;
    signal input nullifier;
    signal input asset;
    signal input amount;
    signal input recipient;
    signal input secret;
    signal input pathElements[20];
    signal input pathIndices[20];
    component note = Note(); note.secret <== secret; note.amount <== amount; note.asset <== asset;
    component spent = Nullifier(); spent.secret <== secret; spent.commitment <== note.commitment;
    spent.hash === nullifier;
    component member = Membership(); member.leaf <== note.commitment; member.root <== root;
    for (var i=0; i<20; i++) { member.pathElements[i] <== pathElements[i]; member.pathIndices[i] <== pathIndices[i]; }
    // Binding the recipient into the constraints prevents a submitter redirecting a proof.
    component recipientBits = Num2Bits(160); recipientBits.in <== recipient;
    component zeroRecipient = IsZero(); zeroRecipient.in <== recipient; zeroRecipient.out === 0;
}
component main {public [root, nullifier, asset, amount, recipient]} = Unshield();
