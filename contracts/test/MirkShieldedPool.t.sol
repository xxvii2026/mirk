// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Test} from "forge-std/Test.sol";
import {MirkShieldedPool} from "../src/MirkShieldedPool.sol";
import {MirkPayMemo} from "../src/MirkPayMemo.sol";
import {IVerifier} from "../src/shielded/interfaces/IVerifier.sol";

// Test doubles exercise accounting/atomicity only. Real-proof tests run separately.
contract TestHasher {
    function poseidon(uint256[2] calldata inputs) external pure returns (uint256) {
        return uint256(keccak256(abi.encode(inputs)))
            % 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    }
}

contract TestVerifier is IVerifier {
    bool public valid = true;
    bytes32 public expected;

    function configure(bool v, bytes32 e) external {
        valid = v;
        expected = e;
    }

    function verify(bytes calldata, uint256[] calldata inputs) external view returns (bool) {
        return valid && (expected == 0 || keccak256(abi.encode(inputs)) == expected);
    }
}

contract TestToken {
    mapping(address => uint256) public balanceOf;
    bool public fee;

    function mint(address a, uint256 n) external {
        balanceOf[a] += n;
    }

    function setFee(bool v) external {
        fee = v;
    }

    function transferFrom(address from, address to, uint256 n) external returns (bool) {
        balanceOf[from] -= n;
        balanceOf[to] += fee ? n - 1 : n;
        return true;
    }

    function transfer(address to, uint256 n) external returns (bool) {
        balanceOf[msg.sender] -= n;
        balanceOf[to] += n;
        return true;
    }
}

contract MirkShieldedPoolTest is Test {
    MirkShieldedPool pool;
    MirkPayMemo memo;
    TestVerifier shield;
    TestVerifier send;
    TestVerifier exit;
    TestToken token;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.chainId(31337);
        shield = new TestVerifier();
        send = new TestVerifier();
        exit = new TestVerifier();
        token = new TestToken();
        address[] memory assets = new address[](2);
        assets[0] = address(0);
        assets[1] = address(token);
        pool = new MirkShieldedPool(
            address(new TestHasher()), address(shield), address(send), address(exit), assets
        );
        memo = new MirkPayMemo(address(pool));
        vm.deal(alice, 10 ether);
    }

    function deposit() internal {
        vm.prank(alice);
        pool.shieldBound{value: 1 ether}(address(0), 1 ether, bytes32(uint256(11)), "");
    }

    function test_DepositTracksBackingAndCommitment() public {
        deposit();
        assertEq(pool.deposited(address(0)), 1 ether);
        assertEq(address(pool).balance, 1 ether);
        assertTrue(pool.commitmentSeen(bytes32(uint256(11))));
        assertEq(pool.nextIndex(), 1);
    }

    function test_InvalidDepositProofNeverTakesFunds() public {
        shield.configure(false, 0);
        vm.expectRevert(MirkShieldedPool.InvalidProof.selector);
        vm.prank(alice);
        pool.shieldBound{value: 1 ether}(address(0), 1 ether, bytes32(uint256(11)), "");
        assertEq(address(pool).balance, 0);
        assertEq(pool.nextIndex(), 0);
    }

    function test_DepositProofReceivesExactAmountAndAsset() public {
        uint256[] memory inputs = new uint256[](3);
        inputs[0] = 11;
        inputs[1] = 1 ether;
        inputs[2] = 0;
        shield.configure(true, keccak256(abi.encode(inputs)));
        deposit();
    }

    function test_RejectsValueMismatch() public {
        vm.expectRevert(MirkShieldedPool.InvalidValue.selector);
        vm.prank(alice);
        pool.shieldBound{value: 2 ether}(address(0), 1 ether, bytes32(uint256(11)), "");
    }

    function test_RejectsDuplicateAndNoncanonicalCommitments() public {
        deposit();
        vm.expectRevert(MirkShieldedPool.DuplicateCommitment.selector);
        vm.prank(alice);
        pool.shieldBound{value: 1 ether}(address(0), 1 ether, bytes32(uint256(11)), "");
        bytes32 invalidField = bytes32(pool.FIELD());
        vm.expectRevert(MirkShieldedPool.InvalidField.selector);
        vm.prank(alice);
        pool.shieldBound{value: 1}(address(0), 1, invalidField, "");
    }

    function test_TransferConsumesOnceWithoutMovingBacking() public {
        deposit();
        bytes32 root = pool.currentRoot();
        bytes32[2] memory outputs = [bytes32(uint256(12)), bytes32(uint256(13))];
        pool.transfer("", root, bytes32(uint256(22)), outputs);
        assertEq(pool.nextIndex(), 3);
        assertEq(pool.deposited(address(0)), 1 ether);
        vm.expectRevert(MirkShieldedPool.AlreadySpent.selector);
        pool.transfer("", root, bytes32(uint256(22)), outputs);
    }

    function test_InvalidTransferRollsBackNullifier() public {
        deposit();
        send.configure(false, 0);
        bytes32[2] memory outputs = [bytes32(uint256(12)), bytes32(uint256(13))];
        bytes32 root = pool.currentRoot();
        vm.expectRevert(MirkShieldedPool.InvalidProof.selector);
        pool.transfer("", root, bytes32(uint256(22)), outputs);
        assertFalse(pool.isSpent(bytes32(uint256(22))));
        assertEq(pool.nextIndex(), 1);
    }

    function test_DuplicateOutputsRollBackWholeTransfer() public {
        deposit();
        bytes32[2] memory outputs = [bytes32(uint256(12)), bytes32(uint256(12))];
        bytes32 root = pool.currentRoot();
        vm.expectRevert(MirkShieldedPool.DuplicateCommitment.selector);
        pool.transfer("", root, bytes32(uint256(22)), outputs);
        assertFalse(pool.isSpent(bytes32(uint256(22))));
        assertFalse(pool.commitmentSeen(bytes32(uint256(12))));
    }

    function test_UnknownRootRejected() public {
        bytes32[2] memory outputs = [bytes32(uint256(12)), bytes32(uint256(13))];
        vm.expectRevert(MirkShieldedPool.UnknownRoot.selector);
        pool.transfer("", bytes32(uint256(999)), bytes32(uint256(22)), outputs);
    }

    function test_WithdrawBindsRecipientAndAmount() public {
        deposit();
        bytes32 root = pool.currentRoot();
        uint256[] memory inputs = new uint256[](5);
        inputs[0] = uint256(root);
        inputs[1] = 22;
        inputs[2] = 0;
        inputs[3] = 1 ether;
        inputs[4] = uint160(bob);
        exit.configure(true, keccak256(abi.encode(inputs)));
        vm.expectRevert(MirkShieldedPool.InvalidProof.selector);
        pool.unshield("", root, bytes32(uint256(22)), address(0), alice, 1 ether);
        pool.unshield("", root, bytes32(uint256(22)), address(0), bob, 1 ether);
        assertEq(bob.balance, 1 ether);
        assertEq(pool.deposited(address(0)), 0);
    }

    function test_TokenDepositsAndWithdrawals() public {
        token.mint(alice, 100);
        vm.prank(alice);
        pool.shieldBound(address(token), 100, bytes32(uint256(11)), "");
        pool.unshield("", pool.currentRoot(), bytes32(uint256(22)), address(token), bob, 100);
        assertEq(token.balanceOf(bob), 100);
        assertEq(pool.deposited(address(token)), 0);
    }

    function test_FeeOnTransferTokenCannotCreateUnbackedNotes() public {
        token.mint(alice, 100);
        token.setFee(true);
        vm.prank(alice);
        vm.expectRevert(MirkShieldedPool.InvalidValue.selector);
        pool.shieldBound(address(token), 100, bytes32(uint256(11)), "");
        assertEq(pool.nextIndex(), 0);
        assertEq(token.balanceOf(alice), 100);
    }

    function test_MemoNeedsExistingCommitmentAndRejectsExactReplay() public {
        vm.expectRevert(MirkPayMemo.InvalidMemo.selector);
        memo.postMemo(bytes32(uint256(11)), hex"01");
        deposit();
        memo.postMemo(bytes32(uint256(11)), hex"01");
        vm.expectRevert(MirkPayMemo.InvalidMemo.selector);
        memo.postMemo(bytes32(uint256(11)), hex"01");
    }
}
