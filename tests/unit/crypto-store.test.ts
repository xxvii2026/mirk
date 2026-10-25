import { beforeEach, describe, expect, it } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { UNLOCK_MESSAGE, WrongKeyError, decryptJson, deriveKek, encryptJson } from "@/lib/crypto-store/crypto";
import { MirkDb, getDb, setDb } from "@/lib/crypto-store/db";
import {
  deleteStore,
  exportBackup,
  parseBackupFile,
  restoreBackup,
  storeExists,
  unlockStore,
} from "@/lib/crypto-store/vault";
import type { NoteRecord } from "@/lib/crypto-store/records";

const note = (amount: string): NoteRecord => ({
  kind: "note",
  secret: `0x${"11".repeat(32)}`,
  commitment: `0x${"22".repeat(32)}`,
  nullifier: `0x${"33".repeat(32)}`,
  amountWei: amount,
  asset: "0x0000000000000000000000000000000000000000",
  status: "unspent",
  origin: "shield",
  createdAt: 1,
});

let n = 0;
beforeEach(() => {
  setDb(new MirkDb(`test-${n++}`));
});

async function wallet() {
  const account = privateKeyToAccount(generatePrivateKey());
  const signature = await account.signMessage({ message: UNLOCK_MESSAGE });
  return { account, signature };
}

describe("encrypted store", () => {
  it("round-trips records and stores only ciphertext", async () => {
    const { account, signature } = await wallet();
    const { vault, created } = await unlockStore(account.address, signature);
    expect(created).toBe(true);
    const id = await vault.put(note("1000"));

    const rows = await getDb().records.toArray();
    expect(rows).toHaveLength(1);
    const raw = JSON.stringify(rows) + JSON.stringify(await getDb().stores.toArray());
    expect(raw).not.toContain("1111111111");
    expect(raw).not.toContain("1000");
    expect(raw).not.toContain("note");
    expect(raw.toLowerCase()).not.toContain(account.address.toLowerCase().slice(2));

    const again = await unlockStore(account.address, signature);
    expect(again.created).toBe(false);
    expect(again.vault.get(id, "note")?.amountWei).toBe("1000");
  });

  it("fails to open with a different signature", async () => {
    const { account, signature } = await wallet();
    await unlockStore(account.address, signature);
    const other = await wallet();
    await expect(unlockStore(account.address, other.signature)).rejects.toBeInstanceOf(WrongKeyError);
  });

  it("binds ciphertext to its slot (AAD)", async () => {
    const { account, signature } = await wallet();
    const kek = await deriveKek(signature, account.address);
    void kek;
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const sealed = await encryptJson(key, { a: 1n }, "slot-1");
    expect(await decryptJson(key, sealed, "slot-1")).toEqual({ a: 1n });
    await expect(decryptJson(key, sealed, "slot-2")).rejects.toBeInstanceOf(WrongKeyError);
  });

  it("locks and deletes", async () => {
    const { account, signature } = await wallet();
    const { vault } = await unlockStore(account.address, signature);
    vault.lock();
    expect(() => vault.list("note")).toThrow();
    expect(await storeExists(account.address)).toBe(true);
    await deleteStore(account.address);
    expect(await storeExists(account.address)).toBe(false);
  });
});

describe("backups", () => {
  it("exports encrypted and restores into a new store", async () => {
    const a = await wallet();
    const { vault } = await unlockStore(a.account.address, a.signature);
    await vault.put(note("42"));
    const file = await exportBackup(vault, "correct horse battery", 46630, 100_000);
    const text = JSON.stringify(file);
    expect(text).not.toContain("1111111111");
    expect(text).not.toContain('"42"');

    const parsed = parseBackupFile(text);
    setDb(new MirkDb(`restore-${n++}`));
    const b = await wallet();
    const { vault: fresh } = await unlockStore(b.account.address, b.signature);
    expect(await restoreBackup(fresh, parsed, "correct horse battery")).toBe(1);
    expect(fresh.list("note")[0]?.value.amountWei).toBe("42");
  });

  it("rejects a wrong passphrase, short passphrases and foreign files", async () => {
    const a = await wallet();
    const { vault } = await unlockStore(a.account.address, a.signature);
    await expect(exportBackup(vault, "short", 46630)).rejects.toThrow();
    const file = await exportBackup(vault, "correct horse battery", 46630, 100_000);
    await expect(restoreBackup(vault, file, "wrong horse battery!")).rejects.toBeInstanceOf(WrongKeyError);
    expect(() => parseBackupFile("{}")).toThrow();
    expect(() => parseBackupFile("not json")).toThrow();
  });
});
