import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * `promisify` collapses `scrypt` onto its three-argument overload and loses the
 * options parameter, so the callback form is wrapped by hand.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * scrypt from Node's own crypto — a real password KDF with no native module to
 * rebuild on every server upgrade. Parameters follow the OWASP minimum for
 * scrypt (N=2^16, r=8, p=1), which costs ~64 MB and ~100 ms per verification.
 */
const N = 2 ** 16;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// scrypt needs to be told it may use more than the 32 MB default.
const MAX_MEMORY = 132 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    { N, r, p, maxmem: MAX_MEMORY },
  );

  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const salt = Buffer.from(saltRaw, "base64");
  const expected = Buffer.from(hashRaw, "base64");

  const derived = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    expected.length,
    { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw), maxmem: MAX_MEMORY },
  );

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
