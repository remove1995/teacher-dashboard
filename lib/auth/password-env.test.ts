import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Native .mjs utility is exercised directly by the production script.
import { updatePasswordEnvironmentText, writePasswordEnvironmentAtomically } from "./password-env.mjs";
// @ts-expect-error Native .mjs runtime is shared with production login.
import { createPasswordHash, passwordHashFromEnvironment, verifyPassword } from "./password-runtime.mjs";

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("production password utility", () => {
  it("creates the production scrypt format and verifies it", async () => {
    const hash = await createPasswordHash("new secure password");
    expect(hash.split("$")).toHaveLength(6);
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("new secure password", hash)).toBe(true);
  });

  it("replaces all password variables while preserving the session secret", () => {
    const current = "DATABASE_URL=db\nTUTORFLOW_PASSWORD_HASH=old\nTUTORFLOW_SESSION_SECRET=keep-exactly\nTUTORFLOW_PASSWORD_HASH_B64=older\nTUTORFLOW_PASSWORD_HASH_B64=duplicate\n";
    const updated = updatePasswordEnvironmentText(current, "encoded-value");
    expect(updated.match(/^TUTORFLOW_PASSWORD_HASH_B64=/gm)).toHaveLength(1);
    expect(updated).not.toContain("TUTORFLOW_PASSWORD_HASH=");
    expect(updated).toContain("TUTORFLOW_SESSION_SECRET=keep-exactly");
  });

  it("writes atomically, creates a backup, and produces a verifiable B64 contract", async () => {
    const directory = await mkdtemp(join(tmpdir(), "tutorflow-auth-"));
    temporaryDirectories.push(directory);
    const envPath = join(directory, ".env");
    const original = "DATABASE_URL=db\nTUTORFLOW_SESSION_SECRET=unchanged\nTUTORFLOW_PASSWORD_HASH=legacy\n";
    await writeFile(envPath, original, { mode: 0o640 });
    const originalMode = (await stat(envPath)).mode & 0o777;
    const hash = await createPasswordHash("atomic password");
    const encoded = Buffer.from(hash, "utf8").toString("base64url");
    await writePasswordEnvironmentAtomically(envPath, encoded);
    expect(await readFile(join(directory, ".env.auth-backup"), "utf8")).toBe(original);
    const updated = await readFile(envPath, "utf8");
    expect(updated).toContain("TUTORFLOW_SESSION_SECRET=unchanged");
    expect(await verifyPassword("atomic password", passwordHashFromEnvironment(encoded, undefined))).toBe(true);
    expect((await stat(envPath)).mode & 0o777).toBe(originalMode);
  });
});
