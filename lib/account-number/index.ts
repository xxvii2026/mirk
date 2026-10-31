/**
 * mirk account numbers: 12 digits, the first 11 cryptographically random and
 * the last a Luhn check digit. Never derived from any identity or key.
 */

export const ACCOUNT_NUMBER_LENGTH = 12;

/** A normalized account number: exactly 12 ASCII digits, leading zeroes kept. */
export type AccountNumber = string & { readonly __brand: "AccountNumber" };

function luhnSum(digits: string, doubleEven: boolean): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    // Position counted from the right, starting at 0.
    const pos = digits.length - 1 - i;
    let d = digits.charCodeAt(i) - 48;
    if ((pos % 2 === 0) === doubleEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum;
}

/** The Luhn check digit for a digit string that does not yet have one. */
export function luhnCheckDigit(body: string): number {
  if (!/^\d+$/.test(body)) throw new Error("Digits only");
  return (10 - (luhnSum(body, true) % 10)) % 10;
}

/** True when the final digit is a valid Luhn check digit for the rest. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false;
  return luhnSum(digits, false) % 10 === 0;
}

/** Remove spaces and dashes a person might type or paste. */
export function normalizeAccountNumber(input: string): string {
  return input.replace(/[\s -]/g, "");
}

export type AccountNumberCheck =
  { ok: true; value: AccountNumber } | { ok: false; reason: "empty" | "format" | "length" | "checksum" | "zero" };

export function checkAccountNumber(input: string): AccountNumberCheck {
  const n = normalizeAccountNumber(input);
  if (n.length === 0) return { ok: false, reason: "empty" };
  if (!/^\d+$/.test(n)) return { ok: false, reason: "format" };
  if (n.length !== ACCOUNT_NUMBER_LENGTH) return { ok: false, reason: "length" };
  if (/^0+$/.test(n)) return { ok: false, reason: "zero" };
  if (!isLuhnValid(n)) return { ok: false, reason: "checksum" };
  return { ok: true, value: n as AccountNumber };
}

export function isAccountNumber(input: string): input is AccountNumber {
  return checkAccountNumber(input).ok && input === normalizeAccountNumber(input);
}

export const ACCOUNT_NUMBER_ERRORS: Record<Exclude<AccountNumberCheck, { ok: true }>["reason"], string> = {
  empty: "Enter a Mirk account number.",
  format: "Account numbers contain digits only.",
  length: "Mirk account numbers have 12 digits.",
  zero: "This is not a valid Mirk account number.",
  checksum: "This number does not pass the check digit. Check it for typos.",
};

/** "482916307714" -> "4829 1630 7714" */
export function formatAccountNumber(n: string): string {
  const d = normalizeAccountNumber(n);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function accountNumberToUint64(n: AccountNumber): bigint {
  return BigInt(n);
}

export function uint64ToAccountNumber(v: bigint): AccountNumber {
  const s = v.toString().padStart(ACCOUNT_NUMBER_LENGTH, "0");
  const check = checkAccountNumber(s);
  if (!check.ok) throw new Error("Not a valid account number");
  return check.value;
}

/** A uniformly random digit using rejection sampling over crypto random bytes. */
function randomDigits(count: number, random: (buf: Uint8Array) => Uint8Array): string {
  let out = "";
  const buf = new Uint8Array(32);
  while (out.length < count) {
    random(buf);
    for (const b of buf) {
      if (b < 250 && out.length < count) out += String(b % 10);
    }
  }
  return out;
}

/**
 * Generate a fresh account number: 11 random digits plus a Luhn check digit.
 * The injectable random source exists for tests only.
 */
export function generateAccountNumber(
  random: (buf: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b),
): AccountNumber {
  for (;;) {
    const body = randomDigits(ACCOUNT_NUMBER_LENGTH - 1, random);
    const n = body + String(luhnCheckDigit(body));
    const check = checkAccountNumber(n);
    if (check.ok) return check.value;
  }
}
