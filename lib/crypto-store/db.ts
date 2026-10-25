import Dexie, { type EntityTable } from "dexie";

/**
 * IndexedDB layout. Only ciphertext, IVs, versions and non-sensitive sync
 * metadata are stored. Record ids are random and the record kind lives inside
 * the ciphertext, so the database does not reveal which notes are yours.
 */

export interface StoreRow {
  /** sha256 of chain + wallet address; see storeIdFor */
  id: string;
  v: number;
  iv: string;
  wrapped: string;
  createdAt: number;
}

export interface RecordRow {
  storeId: string;
  /** random UUID */
  id: string;
  v: number;
  iv: string;
  ct: string;
}

/** Public chain data cached to make syncs incremental. Never holds private data. */
export interface ChainCacheRow {
  key: string;
  value: string;
}

/** Per-store, non-sensitive progress such as the last block scanned for incoming payments. */
export interface StoreMetaRow {
  storeId: string;
  key: string;
  value: string;
}

export class MirkDb extends Dexie {
  stores!: EntityTable<StoreRow, "id">;
  records!: Dexie.Table<RecordRow, [string, string]>;
  chain!: EntityTable<ChainCacheRow, "key">;
  meta!: Dexie.Table<StoreMetaRow, [string, string]>;

  constructor(name = "mirk") {
    super(name);
    this.version(1).stores({
      stores: "id",
      records: "[storeId+id], storeId",
      chain: "key",
      meta: "[storeId+key], storeId",
    });
  }
}

let db: MirkDb | null = null;

export function getDb(): MirkDb {
  db ??= new MirkDb();
  return db;
}

/** Replace the database instance (tests). */
export function setDb(next: MirkDb | null) {
  db = next;
}

export async function storageAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === "undefined") return false;
    await getDb().open();
    return true;
  } catch {
    return false;
  }
}
