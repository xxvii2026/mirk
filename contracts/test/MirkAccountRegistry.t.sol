// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MirkAccountRegistry} from "../src/MirkAccountRegistry.sol";

contract MirkAccountRegistryTest is Test {
    MirkAccountRegistry internal registry;

    address internal owner = makeAddr("owner");
    address internal registrar = makeAddr("registrar");
    address internal stranger = makeAddr("stranger");

    bytes internal constant TAG_A = "gloamr1.MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaaaa";
    bytes internal constant TAG_B = "gloamr1.MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEbbbb";

    event AccountRegistered(uint64 indexed accountNumber, bytes32 indexed receiveTagHash, bytes receiveTag);
    event RegistrarUpdated(address indexed previousRegistrar, address indexed newRegistrar);

    function setUp() public {
        registry = new MirkAccountRegistry(owner, registrar);
    }

    /// Appends a Luhn check digit to an 11-digit body.
    function withCheckDigit(uint64 body) internal pure returns (uint64) {
        uint256 sum;
        uint256 n = body;
        // The check digit sits at position 0, so the body's rightmost digit is doubled.
        for (uint256 i = 0; i < 11; ++i) {
            uint256 d = n % 10;
            n /= 10;
            if (i % 2 == 0) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
        }
        return uint64(body * 10 + ((10 - (sum % 10)) % 10));
    }

    function test_KnownNumberIsValid() public view {
        uint64 n = withCheckDigit(48291630771);
        assertTrue(registry.isValidAccountNumber(n));
        assertFalse(registry.isValidAccountNumber(n + 1 > 999_999_999_999 ? n - 1 : n + 1));
    }

    function test_RegisterSucceeds() public {
        uint64 n = withCheckDigit(48291630771);
        vm.expectEmit(true, true, false, true, address(registry));
        emit AccountRegistered(n, keccak256(TAG_A), TAG_A);
        vm.prank(registrar);
        registry.register(n, TAG_A);

        assertEq(registry.receiveTagOf(n), TAG_A);
        assertEq(registry.accountOfTagHash(keccak256(TAG_A)), n);
        assertTrue(registry.isRegistered(n));
    }

    function test_LeadingZeroNumbersAreSupported() public {
        uint64 n = withCheckDigit(123); // renders as 0000 0000 123x
        vm.prank(registrar);
        registry.register(n, TAG_A);
        assertEq(registry.receiveTagOf(n), TAG_A);
    }

    function test_LookupOfUnknownNumberIsEmpty() public view {
        uint64 n = withCheckDigit(11111111111);
        assertEq(registry.receiveTagOf(n).length, 0);
        assertFalse(registry.isRegistered(n));
        assertEq(registry.accountOfTagHash(keccak256(TAG_B)), 0);
    }

    function test_RevertWhen_DuplicateNumber() public {
        uint64 n = withCheckDigit(48291630771);
        vm.startPrank(registrar);
        registry.register(n, TAG_A);
        vm.expectRevert(MirkAccountRegistry.AccountAlreadyRegistered.selector);
        registry.register(n, TAG_B);
        vm.stopPrank();
    }

    function test_RevertWhen_DuplicateTag() public {
        vm.startPrank(registrar);
        registry.register(withCheckDigit(48291630771), TAG_A);
        vm.expectRevert(MirkAccountRegistry.ReceiveTagAlreadyRegistered.selector);
        registry.register(withCheckDigit(10000000001), TAG_A);
        vm.stopPrank();
    }

    function test_RevertWhen_Unauthorized() public {
        uint64 n = withCheckDigit(48291630771);
        vm.prank(stranger);
        vm.expectRevert(MirkAccountRegistry.NotRegistrar.selector);
        registry.register(n, TAG_A);

        vm.prank(owner);
        vm.expectRevert(MirkAccountRegistry.NotRegistrar.selector);
        registry.register(n, TAG_A);
    }

    function test_RevertWhen_ZeroNumber() public {
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.InvalidAccountNumber.selector);
        registry.register(0, TAG_A);
    }

    function test_RevertWhen_NumberOutOfRange() public {
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.InvalidAccountNumber.selector);
        registry.register(1_000_000_000_009, TAG_A);
    }

    function test_RevertWhen_BadChecksum() public {
        uint64 n = withCheckDigit(48291630771);
        uint64 bad = (n / 10) * 10 + (((n % 10) + 1) % 10);
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.InvalidAccountNumber.selector);
        registry.register(bad, TAG_A);
    }

    function test_RevertWhen_EmptyTag() public {
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.InvalidReceiveTag.selector);
        registry.register(withCheckDigit(48291630771), "");
    }

    function test_RevertWhen_TagTooLong() public {
        bytes memory longTag = new bytes(257);
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.InvalidReceiveTag.selector);
        registry.register(withCheckDigit(48291630771), longTag);
    }

    function test_RegistrarRotation() public {
        address next = makeAddr("next");
        vm.expectEmit(true, true, false, false, address(registry));
        emit RegistrarUpdated(registrar, next);
        vm.prank(owner);
        registry.setRegistrar(next);
        assertEq(registry.registrar(), next);

        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.NotRegistrar.selector);
        registry.register(withCheckDigit(48291630771), TAG_A);

        vm.prank(next);
        registry.register(withCheckDigit(48291630771), TAG_A);
    }

    function test_RevertWhen_NonOwnerRotatesRegistrar() public {
        vm.prank(registrar);
        vm.expectRevert(MirkAccountRegistry.NotOwner.selector);
        registry.setRegistrar(stranger);
    }

    function test_RevertWhen_ZeroRegistrar() public {
        vm.prank(owner);
        vm.expectRevert(MirkAccountRegistry.ZeroAddress.selector);
        registry.setRegistrar(address(0));
    }

    function test_ExistingMappingsSurviveRotationAndOwnershipChange() public {
        uint64 n = withCheckDigit(48291630771);
        vm.prank(registrar);
        registry.register(n, TAG_A);

        address newOwner = makeAddr("newOwner");
        vm.startPrank(owner);
        registry.setRegistrar(stranger);
        registry.transferOwnership(newOwner);
        vm.stopPrank();

        // The new registrar cannot overwrite either side of the mapping.
        vm.startPrank(stranger);
        vm.expectRevert(MirkAccountRegistry.AccountAlreadyRegistered.selector);
        registry.register(n, TAG_B);
        vm.expectRevert(MirkAccountRegistry.ReceiveTagAlreadyRegistered.selector);
        registry.register(withCheckDigit(10000000001), TAG_A);
        vm.stopPrank();

        assertEq(registry.receiveTagOf(n), TAG_A);
        assertEq(registry.accountOfTagHash(keccak256(TAG_A)), n);
        assertEq(registry.owner(), newOwner);
    }

    function test_RevertWhen_NonOwnerTransfersOwnership() public {
        vm.prank(stranger);
        vm.expectRevert(MirkAccountRegistry.NotOwner.selector);
        registry.transferOwnership(stranger);
    }

    function test_RevertWhen_ConstructedWithZeroAddress() public {
        vm.expectRevert(MirkAccountRegistry.ZeroAddress.selector);
        new MirkAccountRegistry(address(0), registrar);
        vm.expectRevert(MirkAccountRegistry.ZeroAddress.selector);
        new MirkAccountRegistry(owner, address(0));
    }

    function testFuzz_ValidNumbersRegister(uint64 body) public {
        body = uint64(bound(body, 0, 99_999_999_999));
        uint64 n = withCheckDigit(body);
        vm.assume(n != 0);
        assertTrue(registry.isValidAccountNumber(n));
        vm.prank(registrar);
        registry.register(n, abi.encodePacked("gloamr1.", n));
        assertTrue(registry.isRegistered(n));
    }

    function testFuzz_SingleDigitChangeBreaksChecksum(uint64 body, uint8 digit) public view {
        body = uint64(bound(body, 1, 99_999_999_999));
        uint64 n = withCheckDigit(body);
        uint64 check = n % 10;
        uint64 other = (check + 1 + (digit % 9)) % 10;
        assertFalse(registry.isValidAccountNumber(n - check + other));
    }
}
