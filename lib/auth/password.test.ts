import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authenticateAndCreateSession, verifyPassword } from "./password";
import { verifySessionToken } from "./session";

const deriveKey = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => nodeScrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
async function hash(password: string) {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

describe("TutorFlow password authentication", () => {
  it("creates a signed session for the correct password", async () => { const encoded = await hash("correct horse"); const secret = "another-test-secret-with-at-least-thirty-two-characters"; const token = await authenticateAndCreateSession("correct horse", encoded, secret); expect(token).not.toBeNull(); expect(await verifySessionToken(token!, secret)).toBe(true); });
  it("does not create a session for a wrong password", async () => { const encoded = await hash("correct horse"); expect(await verifyPassword("wrong", encoded)).toBe(false); expect(await authenticateAndCreateSession("wrong", encoded, "another-test-secret-with-at-least-thirty-two-characters")).toBeNull(); });
});
