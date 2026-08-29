import { scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { createSessionToken } from "./session";

const deriveKey = (password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number; maxmem: number }) => new Promise<Buffer>((resolve, reject) => {
  nodeScrypt(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key));
});

export async function verifyPassword(password: string, encodedHash: string) {
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

export async function authenticateAndCreateSession(password: string, passwordHash: string | undefined, sessionSecret: string | undefined) {
  if (!passwordHash || !sessionSecret || !(await verifyPassword(password, passwordHash))) return null;
  return createSessionToken(sessionSecret);
}
