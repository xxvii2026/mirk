import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { PublicClient } from "viem";
import { MirkDb, setDb } from "@/lib/crypto-store/db";
import { UNLOCK_MESSAGE } from "@/lib/crypto-store/crypto";
import { unlockStore } from "@/lib/crypto-store/vault";
import { reconcile } from "@/lib/shielded/services";
import type { NoteRecord } from "@/lib/crypto-store/records";

let count = 0;
beforeEach(() => setDb(new MirkDb(`reconcile-${count++}`)));
const note: NoteRecord = {
  kind: "note",
  secret: `0x${"11".repeat(32)}`,
  commitment: `0x${"22".repeat(32)}`,
  nullifier: `0x${"33".repeat(32)}`,
  amountWei: "100",
  asset: "0x0000000000000000000000000000000000000000",
  origin: "received",
  status: "pending",
  createdAt: 1,
};
async function context() {
  const account = privateKeyToAccount(generatePrivateKey());
  const signature = await account.signMessage({ message: UNLOCK_MESSAGE });
  const { vault } = await unlockStore(account.address, signature);
  const client = {
    readContract: vi.fn().mockResolvedValue(false),
    getTransactionReceipt: vi.fn().mockRejectedValue(new Error("Not mined")),
  } as unknown as PublicClient;
  return { vault, client };
}
describe("uncertain relay submissions", () => {
  it("keeps an old unconfirmed output pending instead of losing track of its secret", async () => {
    const ctx = await context();
    const id = await ctx.vault.put(note);
    await reconcile(ctx);
    expect(ctx.vault.get(id, "note")?.status).toBe("pending");
  });
  it("does not make an input spendable merely because a relay reply was lost", async () => {
    const ctx = await context();
    const id = await ctx.vault.put({ ...note, status: "spending" });
    await reconcile(ctx);
    expect(ctx.vault.get(id, "note")?.status).toBe("spending");
  });
});
