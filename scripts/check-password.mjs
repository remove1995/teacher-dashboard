import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyPassword } from "../lib/auth/password-runtime.mjs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const hash = process.env.TUTORFLOW_PASSWORD_HASH;
if (!hash) {
  console.log("HASH NOT SET");
  process.exit(0);
}

function readHidden(prompt) {
  return new Promise((resolvePassword, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("Interactive terminal required"));
    let password = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolvePassword(password);
    };
    const onData = (character) => {
      if (character === "\r" || character === "\n") return finish();
      if (character === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        process.exit(130);
      }
      if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
      else password += character;
    };
    process.stdin.on("data", onData);
  });
}

const password = await readHidden("Password: ");
const matches = await verifyPassword(password, hash);
console.log(matches ? "PASSWORD MATCH" : "PASSWORD NO MATCH");
