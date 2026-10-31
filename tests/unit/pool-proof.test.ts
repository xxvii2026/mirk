import { afterAll, describe, expect, it } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { protocolFingerprint } from "../../scripts/shielded/fingerprint.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  zeroAddress,
  type Address,
  type Hex,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildShieldBoundIntent,
  buildPrivateSendIntent,
  buildUnshieldIntent,
  IncrementalMerkleTreePoseidon,
  hexToField,
  fieldToHex,
  packGroth16Proof,
  sweepReceivedNote,
  scanIncomingPayments,
  generateReceiveKey,
  sealToReceiveTag,
  openSealedTicket,
  encodeNotePackage,
  decodeNotePackage,
  type PoolCircuit,
  type Groth16Proof,
} from "@/lib/shielded/sdk";

// Explicit opt-in: generates real proofs, deploys to a disposable local chain,
// and tests actual verifier contracts rather than accepting a mock verifier.
const enabled = process.env.MIRK_PROOF_TEST === "1";
let anvil: ChildProcess | undefined;
afterAll(() => {
  anvil?.kill();
});

describe.skipIf(!enabled)("Mirk real proofs", () => {
  it("deposits, sends, discovers and withdraws; rejects forgery, inflation, redirection and double spend", async () => {
    const forge = process.env.FORGE_BIN || "/home/codespace/.foundry/bin/forge";
    const compiled = spawnSync(forge, ["build", "--root", "contracts"], { encoding: "utf8" });
    if (compiled.status !== 0) throw new Error(compiled.stderr || compiled.stdout);
    const { deployMirk, artifact } = await import("../../scripts/shielded/deploy-lib.mjs");
    const port = 18547;
    const rpc = `http://127.0.0.1:${port}`;
    anvil = spawn(process.env.ANVIL_BIN || "/home/codespace/.foundry/bin/anvil", [
      "--port",
      String(port),
      "--chain-id",
      "31337",
      "--gas-limit",
      "100000000",
      "--silent",
    ]);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        clearInterval(poll);
        reject(new Error("Local chain did not start."));
      }, 15_000);
      anvil!.once("error", reject);
      const poll = setInterval(() => {
        fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
        })
          .then((r) => r.json())
          .then((r) => {
            if (r.result === "0x7a69") {
              clearTimeout(timer);
              clearInterval(poll);
              resolve();
            }
          })
          .catch(() => {});
      }, 200);
    });
    // Public Anvil development key, never used on a public network.
    const key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const deployed = await deployMirk({ rpc, key, chainId: 31337 });
    const chain = defineChain({
      id: 31337,
      name: "Local",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpc] } },
    });
    const account = privateKeyToAccount(key);
    const client = createPublicClient({ chain, transport: http(rpc) });
    const wallet = createWalletClient({ account, chain, transport: http(rpc) });
    const pool = deployed.pool.address as Address;
    const abi = artifact("MirkShieldedPool").abi as Abi;
    const snark = await import("snarkjs");
    let lastProof: { proof: Groth16Proof; publicSignals: string[] };
    const prove = (circuit: PoolCircuit) => async (input: Record<string, string | string[]>) => {
      const result = await snark.groth16.fullProve(
        input,
        `contracts/circuits/build/${circuit}_js/${circuit}.wasm`,
        `contracts/circuits/build/${circuit}.zkey`,
      );
      lastProof = { proof: result.proof as Groth16Proof, publicSignals: result.publicSignals as string[] };
      const vk = JSON.parse(readFileSync(`contracts/circuits/build/${circuit}.vkey.json`, "utf8"));
      expect(await snark.groth16.verify(vk, result.publicSignals, result.proof)).toBe(true);
      return {
        proofBytes: packGroth16Proof(result.proof as Groth16Proof),
        publicSignals: result.publicSignals as string[],
      };
    };
    async function execute(fn: string, args: readonly unknown[], value = 0n) {
      const hash = await wallet.writeContract({ address: pool, abi, functionName: fn, args, value, gas: 30_000_000n });
      const receipt = await client.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      return receipt;
    }
    async function rejects(fn: string, args: readonly unknown[], value = 0n) {
      await expect(
        client.simulateContract({ account, address: pool, abi, functionName: fn, args, value }),
      ).rejects.toThrow();
    }
    const tree = new IncrementalMerkleTreePoseidon();
    const amount = 1_000_000n;
    const shield = await buildShieldBoundIntent({
      chainId: 46630,
      poolAddress: pool,
      amountWei: amount,
      prover: prove("shield"),
    });
    await rejects("shieldBound", [zeroAddress, amount + 1n, shield.note.commitment, shield.exec.args[3]], amount + 1n);
    await rejects("shieldBound", [zeroAddress, amount, shield.note.commitment, `0x${"00".repeat(256)}`], amount);
    await execute("shieldBound", shield.exec.args, amount);
    await tree.init();
    await tree.insert(shield.note.commitmentField);
    expect(await client.readContract({ address: pool, abi, functionName: "currentRoot" })).toBe(
      fieldToHex(tree.currentRoot),
    );
    const path = await tree.path(0);
    const send = await buildPrivateSendIntent({
      poolAddress: pool,
      chainId: 46630,
      secretHex: shield.note.secret,
      amountInWei: amount,
      amountPayWei: 400_000n,
      path,
      prove: prove("transfer"),
    });
    const badWitness = {
      secretIn: shield.note.secretField.toString(),
      amountIn: amount.toString(),
      asset: "0",
      pathElements: path.pathElements.map(String),
      pathIndices: path.pathIndices.map(String),
      root: path.root.toString(),
      nullifier: shield.note.nullifierField.toString(),
      newCommitment0: BigInt(send.paymentNote.commitment).toString(),
      newCommitment1: BigInt(send.changeNote.commitment).toString(),
      secretPay: BigInt(send.paymentNote.secret).toString(),
      amountPay: "400001",
      secretChange: BigInt(send.changeNote.secret).toString(),
      amountChange: "600000",
    };
    await expect(prove("transfer")(badWitness)).rejects.toThrow();
    await execute("transfer", send.exec.args);
    await rejects("transfer", send.exec.args);
    await tree.insert(hexToField(send.paymentNote.commitment));
    await tree.insert(hexToField(send.changeNote.commitment));
    const receive = await generateReceiveKey();
    const sealed = await sealToReceiveTag(encodeNotePackage({ ...send.paymentNote, pool }), receive.tag);
    const opened = decodeNotePackage(await openSealedTicket(sealed, receive));
    expect(opened.commitment).toBe(send.paymentNote.commitment);
    const wrongKey = await generateReceiveKey();
    await expect(openSealedTicket(sealed, wrongKey)).rejects.toThrow();
    const memoAbi = artifact("MirkPayMemo").abi as Abi;
    const memoBytes = `0x${Buffer.from(sealed).toString("hex")}` as Hex;
    const memoHash = await wallet.writeContract({
      address: deployed.memo.address as Address,
      abi: memoAbi,
      functionName: "postMemo",
      args: [send.paymentNote.commitment, memoBytes],
    });
    expect((await client.waitForTransactionReceipt({ hash: memoHash })).status).toBe("success");
    const discovered = await scanIncomingPayments({
      client,
      network: {
        chainId: 46630,
        pool,
        deployBlock: deployed.pool.block,
        payMemo: deployed.memo.address,
        explorerUrl: "",
        rpcUrl: rpc,
        chain,
        assets: [],
      },
      board: { address: deployed.memo.address, deployBlock: deployed.memo.block, emitsPoster: false },
      receiveKey: receive,
    });
    expect(discovered.payments).toHaveLength(1);
    const sweep = await sweepReceivedNote({
      note: send.paymentNote,
      poolAddress: pool,
      chainId: 46630,
      prove: prove("transfer"),
      chain: {
        isSpent: async (n) =>
          Boolean(await client.readContract({ address: pool, abi, functionName: "isSpent", args: [n] })),
        isCommitmentSeen: async (c) =>
          Boolean(await client.readContract({ address: pool, abi, functionName: "commitmentSeen", args: [c] })),
        pathForCommitment: async (c) => tree.path(tree.leaves.indexOf(hexToField(c))),
        waitForReceipt: async (h) => ({ status: (await client.waitForTransactionReceipt({ hash: h })).status }),
      },
      submit: async (intent) => {
        const receipt = await execute("transfer", intent.exec.args);
        await tree.insert(hexToField(intent.paymentNote.commitment));
        await tree.insert(hexToField(intent.changeNote.commitment));
        return receipt.transactionHash;
      },
    });
    expect(sweep.final).toBe(true);
    expect(sweep.freshNote!.secret).not.toBe(send.paymentNote.secret);
    const recipient = "0x000000000000000000000000000000000000bEEF";
    const withdrawal = await buildUnshieldIntent({
      chainId: 46630,
      poolAddress: pool,
      secretHex: sweep.freshNote!.secret,
      amountWei: 400_000n,
      to: recipient,
      path: await tree.path(3),
      prove: prove("unshield"),
    });
    const altered = [...withdrawal.exec.args];
    altered[4] = account.address;
    await rejects("unshield", altered);
    const vk = JSON.parse(readFileSync("contracts/circuits/build/unshield.vkey.json", "utf8"));
    const signals = [...lastProof!.publicSignals];
    signals[4] = BigInt(account.address).toString();
    expect(await snark.groth16.verify(vk, signals, lastProof!.proof)).toBe(false);
    await execute("unshield", withdrawal.exec.args);
    expect(await client.getBalance({ address: recipient })).toBe(400_000n);
    expect(await client.getBalance({ address: pool })).toBe(600_000n);
    await rejects("unshield", withdrawal.exec.args);
    const digest = createHash("sha256").update(readFileSync("lib/shielded/artifact-manifest.json")).digest("hex");
    mkdirSync("contracts/circuits/build", { recursive: true });
    writeFileSync(
      "contracts/circuits/build/validated.json",
      JSON.stringify({
        manifestSha256: digest,
        protocolFingerprint: protocolFingerprint(),
        realProofs: true,
        testedAt: new Date().toISOString(),
      }),
    );
  }, 300_000);
});
