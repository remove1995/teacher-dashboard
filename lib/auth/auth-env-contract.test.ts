import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("production password environment contract", () => {
  it("uses the same effective hash helper in login and CLI", () => {
    const login = source("app/actions/auth.ts");
    const checker = source("scripts/check-password.mjs");
    expect(login).toContain("const passwordHash = effectivePasswordHash()");
    expect(checker).toContain("const hash = effectivePasswordHash()");
    expect(login).not.toContain("process.env.TUTORFLOW_PASSWORD_HASH_B64");
    expect(checker).not.toContain("process.env.TUTORFLOW_PASSWORD_HASH_B64");
  });
});
