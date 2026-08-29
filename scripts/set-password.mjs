import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createPasswordHash, verifyPassword } from "../lib/auth/password-runtime.mjs";
import { writePasswordEnvironmentAtomically } from "../lib/auth/password-env.mjs";

function readHidden(prompt) {
  return new Promise((resolvePassword, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("Interactive terminal required"));
    let password = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const restore = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };
    const finish = () => { restore(); process.stdout.write("\n"); resolvePassword(password); };
    const onData = (input) => {
      for (const character of input) {
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0003") { restore(); process.stdout.write("\n"); process.exit(130); }
        if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
        else password += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

const envPath = resolve(process.cwd(), ".env");
if (!existsSync(envPath)) {
  console.log("ENV NOT FOUND");
  process.exit(1);
}

try {
  const password = await readHidden("New password: ");
  const confirmation = await readHidden("Repeat password: ");
  if (password !== confirmation) {
    console.log("PASSWORDS DO NOT MATCH");
    process.exit(1);
  }

  const hash = await createPasswordHash(password);
  if (!(await verifyPassword(password, hash))) {
    console.log("HASH VERIFICATION FAILED");
    process.exit(1);
  }

  const encoded = Buffer.from(hash, "utf8").toString("base64url");
  await writePasswordEnvironmentAtomically(envPath, encoded);
  console.log("PASSWORDS MATCH");
  console.log("HASH VERIFIED");
  console.log("ENV UPDATED");
} catch {
  console.log("ENV UPDATE FAILED");
  process.exit(1);
}
