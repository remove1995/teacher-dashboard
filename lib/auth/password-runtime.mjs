import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const deriveKey = (password, salt, length, options) => new Promise((resolve, reject) => {
  nodeScrypt(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key));
});

export async function verifyPassword(password, encodedHash) {
  const [algorithm, nText, rText, pText, saltText, expectedText] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !nText || !rText || !pText || !saltText || !expectedText) return false;
  const N = Number(nText), r = Number(rText), p = Number(pText);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 16384 || r < 8 || p < 1) return false;
  try {
    const expected = Buffer.from(expectedText, "base64url");
    const actual = await deriveKey(password, Buffer.from(saltText, "base64url"), expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function createPasswordHash(password) {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", "16384", "8", "1", salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export function passwordHashFromEnvironment(base64urlHash, legacyHash) {
  if (!base64urlHash) return legacyHash;
  try {
    const decoded = Buffer.from(base64urlHash, "base64url").toString("utf8");
    return decoded || undefined;
  } catch {
    return undefined;
  }
}

export function effectivePasswordHash(environment = process.env) {
  return passwordHashFromEnvironment(environment.TUTORFLOW_PASSWORD_HASH_B64, environment.TUTORFLOW_PASSWORD_HASH);
}
