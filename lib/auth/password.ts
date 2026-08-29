import { createSessionToken } from "./session";
// TypeScript does not associate declarations with native .mjs modules under the current bundler resolution.
// @ts-expect-error The runtime export is typed explicitly below and covered by auth tests.
import { effectivePasswordHash as runtimeEffectivePasswordHash, passwordHashFromEnvironment as runtimePasswordHashFromEnvironment, verifyPassword as runtimeVerifyPassword } from "./password-runtime.mjs";

export const verifyPassword: (password: string, encodedHash: string) => Promise<boolean> = runtimeVerifyPassword;
export const passwordHashFromEnvironment: (base64urlHash: string | undefined, legacyHash: string | undefined) => string | undefined = runtimePasswordHashFromEnvironment;
export const effectivePasswordHash: (environment?: { TUTORFLOW_PASSWORD_HASH_B64?: string; TUTORFLOW_PASSWORD_HASH?: string }) => string | undefined = runtimeEffectivePasswordHash;

export async function authenticateAndCreateSession(password: string, passwordHash: string | undefined, sessionSecret: string | undefined) {
  if (!passwordHash || !sessionSecret || !(await verifyPassword(password, passwordHash))) return null;
  return createSessionToken(sessionSecret);
}
