pragma circom 2.1.6;
include "common.circom";
template Shield() {
    signal input commitment;
    signal input amount;
    signal input asset;
    signal input secret;
    component note = Note();
    note.secret <== secret; note.amount <== amount; note.asset <== asset;
    note.commitment === commitment;
}
component main {public [commitment, amount, asset]} = Shield();
