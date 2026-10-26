import type { Hex } from "viem";
import { z } from "zod";
import {
  BACKUP_PBKDF2_ITERATIONS,
  STORE_VERSION,
  WrongKeyError,
  createVaultKey,
  decryptJson,
  deriveBackupKey,
  deriveKek,
  encryptJson,
  fromB64,
  randomBytes,
  storeIdFor,
  toB64,
  unwrapVaultKey,
} from "./crypto";
import { getDb } from "./db";
import { anyRecord, type AnyRecord, type RecordKind, type RecordOf } from "./records";

export interface StoredRecord<R extends AnyRecord = AnyRecord> {
  id: string;
  value: R;
}

function aadFor(storeId: string, id: string): string {
  return `mirk-record|v${STORE_VERSION}|${storeId}|${id}`;
}

/**
 * An unlocked private store. Holds the vault key in memory (non-extractable)
 * and a decrypted cache of records. Writes are encrypted before they touch
 * IndexedDB.
 */
export class PrivateVault {
  private cache = new Map<string, AnyRecord>();
  private listeners = new Set<() => void>();
  private version = 0;
  private locked = false;

  private constructor(
    readonly storeId: string,
    private readonly key: CryptoKey,
  ) {}

  static async open(storeId: string, key: CryptoKey): Promise<PrivateVault> {
    const vault = new PrivateVault(storeId, key);
    await vault.reload();
    return vault;
  }

  private assertOpen() {
    if (this.locked) throw new Error("The private store is locked.");
  }

  async reload() {
    this.assertOpen();
    const rows = await getDb().records.where("storeId").equals(this.storeId).toArray();
    const next = new Map<string, AnyRecord>();
    for (const row of rows) {
      const plain = await decryptJson(this.key, row, aadFor(this.storeId, row.id));
      next.set(row.id, anyRecord.parse(plain));
    }
    this.cache = next;
    this.emit();
  }

  /** Change counter for React's useSyncExternalStore. */
  getVersion = () => this.version;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  list<K extends RecordKind>(kind: K): StoredRecord<RecordOf<K>>[] {
    this.assertOpen();
    const out: StoredRecord<RecordOf<K>>[] = [];
    for (const [id, value] of this.cache) {
      if (value.kind === kind) out.push({ id, value: value as RecordOf<K> });
    }
    return out;
  }

  get<K extends RecordKind>(id: string, kind: K): RecordOf<K> | undefined {
    this.assertOpen();
    const v = this.cache.get(id);
    return v && v.kind === kind ? (v as RecordOf<K>) : undefined;
  }

  /** Encrypt and persist a record. Resolves only after IndexedDB commits. */
  async put<R extends AnyRecord>(value: R, id: string = crypto.randomUUID()): Promise<string> {
    this.assertOpen();
    const parsed = anyRecord.parse(value);
    const sealed = await encryptJson(this.key, parsed, aadFor(this.storeId, id));
    await getDb().records.put({ storeId: this.storeId, id, v: STORE_VERSION, ...sealed });
    this.cache.set(id, parsed);
    this.emit();
    return id;
  }

  async update<K extends RecordKind>(
    id: string,
    kind: K,
    patch: (current: RecordOf<K>) => RecordOf<K>,
  ): Promise<RecordOf<K>> {
    const current = this.get(id, kind);
    if (!current) throw new Error("Record not found");
    const next = patch(current);
    await this.put(next, id);
    return next;
  }

  async remove(id: string) {
    this.assertOpen();
    await getDb().records.delete([this.storeId, id]);
    this.cache.delete(id);
    this.emit();
  }

  async getMeta(key: string): Promise<string | undefined> {
    return (await getDb().meta.get([this.storeId, key]))?.value;
  }

  async setMeta(key: string, value: string) {
    await getDb().meta.put({ storeId: this.storeId, key, value });
  }

  /** Forget the in-memory key and plaintext. */
  lock() {
    this.cache.clear();
    this.locked = true;
    this.emit();
  }

  get isLocked() {
    return this.locked;
  }

  allRecords(): StoredRecord[] {
    this.assertOpen();
    return Array.from(this.cache, ([id, value]) => ({ id, value }));
  }
}

/**
 * Open (or create on first use) the store for a wallet using its unlock
 * signature. The signature is used here and discarded; it is never stored or sent.
 */
export async function unlockStore(address: string, signature: Hex): Promise<{ vault: PrivateVault; created: boolean }> {
  const storeId = await storeIdFor(address);
  const kek = await deriveKek(signature, address);
  const db = getDb();
  const existing = await db.stores.get(storeId);
  if (existing) {
    const key = await unwrapVaultKey(kek, existing);
    return { vault: await PrivateVault.open(storeId, key), created: false };
  }
  const { key, wrapped } = await createVaultKey(kek);
  await db.stores.put({ id: storeId, v: STORE_VERSION, ...wrapped, createdAt: Date.now() });
  return { vault: await PrivateVault.open(storeId, key), created: true };
}

export async function storeExists(address: string): Promise<boolean> {
  return Boolean(await getDb().stores.get(await storeIdFor(address)));
}

/** Permanently delete this wallet's store from this device. */
export async function deleteStore(address: string) {
  const storeId = await storeIdFor(address);
  const db = getDb();
  await db.transaction("rw", db.stores, db.records, db.meta, async () => {
    await db.records.where("storeId").equals(storeId).delete();
    await db.meta.where("storeId").equals(storeId).delete();
    await db.stores.delete(storeId);
  });
}

/* ---------------------------------------------------------------- backups */

export const BACKUP_FORMAT = "mirk-backup";
export const BACKUP_VERSION = 1;

const backupFile = z.object({
  format: z.literal(BACKUP_FORMAT),
  v: z.literal(BACKUP_VERSION),
  chainId: z.number(),
  createdAt: z.number(),
  kdf: z.object({ name: z.literal("PBKDF2-SHA256"), iterations: z.number().int().min(100_000), salt: z.string() }),
  iv: z.string(),
  ct: z.string(),
});
export type BackupFile = z.infer<typeof backupFile>;

const backupPayload = z.object({
  records: z.array(z.object({ id: z.string(), value: anyRecord })),
});

const BACKUP_AAD = `${BACKUP_FORMAT}|v${BACKUP_VERSION}`;

export const MIN_PASSPHRASE_LENGTH = 12;

/** Every record, re-encrypted under a passphrase. The file never holds plaintext. */
export async function exportBackup(
  vault: PrivateVault,
  passphrase: string,
  chainId: number,
  iterations = BACKUP_PBKDF2_ITERATIONS,
): Promise<BackupFile> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  const salt = randomBytes(16);
  const key = await deriveBackupKey(passphrase, salt, iterations);
  const sealed = await encryptJson(key, { records: vault.allRecords() }, BACKUP_AAD);
  return {
    format: BACKUP_FORMAT,
    v: BACKUP_VERSION,
    chainId,
    createdAt: Date.now(),
    kdf: { name: "PBKDF2-SHA256", iterations, salt: toB64(salt) },
    ...sealed,
  };
}

export function parseBackupFile(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("This file is not a mirk backup.");
  }
  const parsed = backupFile.safeParse(json);
  if (!parsed.success) throw new Error("This file is not a mirk backup, or its version is not supported.");
  return parsed.data;
}

/** Decrypt a backup and merge its records into the open store. Returns how many were restored. */
export async function restoreBackup(vault: PrivateVault, file: BackupFile, passphrase: string): Promise<number> {
  const key = await deriveBackupKey(passphrase, fromB64(file.kdf.salt), file.kdf.iterations);
  let payload: unknown;
  try {
    payload = await decryptJson(key, file, BACKUP_AAD);
  } catch (e) {
    if (e instanceof WrongKeyError) throw new WrongKeyError("Wrong passphrase, or the backup is damaged.");
    throw e;
  }
  const { records } = backupPayload.parse(payload);
  let count = 0;
  for (const r of records) {
    const existing = vault.allRecords().find((x) => x.id === r.id);
    // Never downgrade a note we already know is spent.
    if (existing?.value.kind === "note" && r.value.kind === "note" && existing.value.status === "spent") continue;
    await vault.put(r.value, r.id);
    count++;
  }
  return count;
}
