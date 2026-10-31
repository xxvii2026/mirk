pragma circom 2.1.6;
include "common.circom";
template Transfer() {
    signal input root;
    signal input nullifier;
    signal input newCommitment0;
    signal input newCommitment1;
    signal input secretIn;
    signal input amountIn;
    signal input asset;
    signal input pathElements[20];
    signal input pathIndices[20];
    signal input secretPay;
    signal input amountPay;
    signal input secretChange;
    signal input amountChange;
    component source = Note();
    source.secret <== secretIn; source.amount <== amountIn; source.asset <== asset;
    component payment = Note();
    payment.secret <== secretPay; payment.amount <== amountPay; payment.asset <== asset;
    payment.commitment === newCommitment0;
    component change = Note();
    change.secret <== secretChange; change.amount <== amountChange; change.asset <== asset;
    change.commitment === newCommitment1;
    amountPay + amountChange === amountIn;
    component zeroPay = IsZero(); zeroPay.in <== amountPay; zeroPay.out === 0;
    component spent = Nullifier(); spent.secret <== secretIn; spent.commitment <== source.commitment;
    spent.hash === nullifier;
    component member = Membership(); member.leaf <== source.commitment; member.root <== root;
    for (var i=0; i<20; i++) { member.pathElements[i] <== pathElements[i]; member.pathIndices[i] <== pathIndices[i]; }
}
component main {public [root, nullifier, newCommitment0, newCommitment1]} = Transfer();
