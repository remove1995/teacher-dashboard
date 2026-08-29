import { scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

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
