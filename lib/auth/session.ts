export const SESSION_COOKIE_NAME = "tutorflow_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
type SessionCookieStore = { set(name: string, value: string, options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number }): void };

export function setSessionCookie(store: SessionCookieStore, token: string, secure: boolean) {
  store.set(SESSION_COOKIE_NAME, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
}

export function clearSessionCookie(store: SessionCookieStore, secure: boolean) {
  store.set(SESSION_COOKIE_NAME, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

const encoder = new TextEncoder();
const base64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const fromBase64url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};
const signingKey = (secret: string) => crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function createSessionToken(secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("TUTORFLOW_SESSION_SECRET must contain at least 32 characters");
  const payload = base64url(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS }));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!token || !secret || secret.length < 32) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), fromBase64url(signature), encoder.encode(payload));
    if (!valid) return false;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export async function routeAuthDecision(pathname: string, token: string | undefined, secret: string | undefined) {
  const authenticated = await verifySessionToken(token, secret);
  if (pathname === "/login") return authenticated ? "home" as const : "allow" as const;
  return authenticated ? "allow" as const : "login" as const;
}
