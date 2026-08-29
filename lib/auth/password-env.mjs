import { copyFile, open, readFile, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const passwordVariable = /^\s*(?:export\s+)?TUTORFLOW_PASSWORD_HASH(?:_B64)?\s*=/;

export function updatePasswordEnvironmentText(current, encodedHash) {
  const newline = current.includes("\r\n") ? "\r\n" : "\n";
  const retained = current.split(/\r?\n/).filter((line) => !passwordVariable.test(line));
  while (retained.length && retained.at(-1) === "") retained.pop();
  retained.push(`TUTORFLOW_PASSWORD_HASH_B64=${encodedHash}`);
  return `${retained.join(newline)}${newline}`;
}

export async function writePasswordEnvironmentAtomically(envPath, encodedHash) {
  const current = await readFile(envPath, "utf8");
  const fileStat = await stat(envPath);
  const backupPath = join(dirname(envPath), ".env.auth-backup");
  const temporaryPath = join(dirname(envPath), `.${basename(envPath)}.auth-${process.pid}-${Date.now()}.tmp`);
  const updated = updatePasswordEnvironmentText(current, encodedHash);

  await copyFile(envPath, backupPath);
  let handle;
  try {
    handle = await open(temporaryPath, "wx", fileStat.mode);
    await handle.writeFile(updated, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, envPath);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
  return { backupPath };
}
