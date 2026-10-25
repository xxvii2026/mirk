// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MirkAccountRegistry} from "../src/MirkAccountRegistry.sol";

/// Deploys the registry with the deployer as owner and REGISTRAR_ADDRESS as registrar.
///   forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (MirkAccountRegistry registry) {
        address registrar = vm.envAddress("REGISTRAR_ADDRESS");
        require(block.chainid == 46630, "MIRK deploys to Robinhood Chain testnet only");

        vm.startBroadcast();
        registry = new MirkAccountRegistry(msg.sender, registrar);
        vm.stopBroadcast();

        console2.log("MirkAccountRegistry", address(registry));
        console2.log("owner", msg.sender);
        console2.log("registrar", registrar);
    }
}
