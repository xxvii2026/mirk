// Stand-in for optional x402 packages that @coinbase/cdp-sdk (pulled in by
// wagmi's Base connector) imports. mirk never reaches those code paths; if
// anything ever does, it fails loudly instead of doing something unexpected.
function unavailable() {
  throw new Error("x402 support is not bundled in Mirk.");
}
export const toClientEvmSigner = unavailable;
export const registerExactEvmScheme = unavailable;
export const registerExactSvmScheme = unavailable;
export const x402Client = unavailable;
export const ExactEvmScheme = unavailable;
export const ExactSvmScheme = unavailable;
export const UptoEvmScheme = unavailable;
const empty = {};
export default empty;
