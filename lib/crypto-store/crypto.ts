/**
 * Client-side cryptography for the private store. Everything here runs on the
 * device with WebCrypto; no key, signature or plaintext ever leaves it.
 *
 *   signature --SHA-256--> ikm --HKDF-SHA256(salt, info)--> key-encryption key
 *   random 256-bit vault key, wrapped (AES-GCM) by the key-encryption key
 *   every record encrypted (AES-GCM) by the vault key, bound to its slot via AAD
 */

import { hexToBytes, type Hex } from "viem";
import { CHAIN_ID } from "../robinhood/network";

export const STORE_VERSION = 1;

export const UNLOCK_MESSAGE = [
  "Unlock MIRK private storage",
  `Chain: ${CHAIN_ID}`,
  `Version: ${STORE_VERSION}`,
  "",
  "This signature stays on this device and does not authorize a transaction.",
].join("\n");

const HKDF_SALT = "mirk/private-store/kek/v1";
const enc = new TextEncoder();
const dec = new TextDecoder();

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("This browser does not support secure encryption (WebCrypto).");
  return globalThis.crypto.subtle;
}

// WebCrypto wants ArrayBuffer-backed views; copy to make the type exact.
function buf(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out;
}

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = new Uint8Array(await subtle().digest("SHA-256", enc.encode(input)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stable, non-reversible store id for a wallet, so the address is not a database key. */
export function storeIdFor(address: string): Promise<string> {
  return sha256Hex(`mirk-store|${CHAIN_ID}|${address.toLowerCase()}`);
}

/** Derive the key-encryption key from the wallet's unlock signature. */
export async function deriveKek(signature: Hex, address: string): Promise<CryptoKey> {
  const ikm = new Uint8Array(await subtle().digest("SHA-256", buf(hexToBytes(signature))));
  const base = await subtle().importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  ikm.fill(0);
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(HKDF_SALT),
      info: enc.encode(`mirk-kek|chain:${CHAIN_ID}|v:${STORE_VERSION}|${address.toLowerCase()}`),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export interface WrappedKey {
  iv: string;
  wrapped: string;
}

/** A fresh random 256-bit vault key, returned wrapped and as a usable (non-extractable) key. */
export async function createVaultKey(kek: CryptoKey): Promise<{ key: CryptoKey; wrapped: WrappedKey }> {
  const raw = randomBytes(32);
  const extractable = await subtle().importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
  const iv = randomBytes(12);
  const wrapped = new Uint8Array(await subtle().wrapKey("raw", extractable, kek, { name: "AES-GCM", iv }));
  const key = await subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  raw.fill(0);
  return { key, wrapped: { iv: toB64(iv), wrapped: toB64(wrapped) } };
}

export class WrongKeyError extends Error {
  constructor(message = "This key cannot open the private store.") {
    super(message);
    this.name = "WrongKeyError";
  }
}

export async function unwrapVaultKey(kek: CryptoKey, w: WrappedKey): Promise<CryptoKey> {
  try {
    return await subtle().unwrapKey(
      "raw",
      fromB64(w.wrapped),
      kek,
      { name: "AES-GCM", iv: fromB64(w.iv) },
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new WrongKeyError();
  }
}

export interface Sealed {
  iv: string;
  ct: string;
}

const replacer = (_k: string, v: unknown) => (typeof v === "bigint" ? { $bigint: v.toString() } : v);
const reviver = (_k: string, v: unknown) =>
  v && typeof v === "object" && "$bigint" in v && typeof (v as { $bigint: unknown }).$bigint === "string"
    ? BigInt((v as { $bigint: string }).$bigint)
    : v;

export async function encryptJson(key: CryptoKey, value: unknown, aad: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const pt = enc.encode(JSON.stringify(value, replacer));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, key, pt));
  pt.fill(0);
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJson<T = unknown>(key: CryptoKey, sealed: Sealed, aad: string): Promise<T> {
  let pt: Uint8Array;
  try {
    pt = new Uint8Array(
      await subtle().decrypt(
        { name: "AES-GCM", iv: fromB64(sealed.iv), additionalData: enc.encode(aad) },
        key,
        fromB64(sealed.ct),
      ),
    );
  } catch {
    throw new WrongKeyError("A record could not be decrypted with this key.");
  }
  const out = JSON.parse(dec.decode(pt), reviver) as T;
  pt.fill(0);
  return out;
}

export const BACKUP_PBKDF2_ITERATIONS = 600_000;

/** Key for an encrypted backup file, from a passphrase the person chooses. */
export async function deriveBackupKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", enc.encode(passphrase.normalize("NFKC")), "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: buf(salt), iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
