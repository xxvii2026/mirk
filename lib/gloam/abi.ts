/** Minimal ABIs for the pool calls mirk signs. Argument order matches the SDK's exec.args. */

export const SHIELD_BOUND_ABI = [
  {
    type: "function",
    name: "shieldBound",
    stateMutability: "payable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "commitment", type: "bytes32" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const UNSHIELD_ABI = [
  {
    type: "function",
    name: "unshield",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
      { name: "asset", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/** GloamPayMemo.postMemo (the encrypted payment-message board). */
export const PAY_MEMO_ABI = [
  {
    type: "function",
    name: "postMemo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentCommitment", type: "bytes32" },
      { name: "memo", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "receiveTagOf",
    stateMutability: "view",
    inputs: [{ name: "accountNumber", type: "uint64" }],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "accountOfTagHash",
    stateMutability: "view",
    inputs: [{ name: "receiveTagHash", type: "bytes32" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [{ name: "accountNumber", type: "uint64" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "accountNumber", type: "uint64" },
      { name: "receiveTag", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registrar",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;
