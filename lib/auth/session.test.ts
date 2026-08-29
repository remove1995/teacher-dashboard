import { describe, expect, it, vi } from "vitest";
import { clearSessionCookie, createSessionToken, routeAuthDecision, SESSION_COOKIE_NAME, verifySessionToken } from "./session";

const secret = "test-session-secret-that-is-longer-than-thirty-two-characters";

describe("TutorFlow signed session", () => {
  it("redirects an unauthenticated protected request to login", async () => expect(await routeAuthDecision("/students", undefined, secret)).toBe("login"));
  it("allows an authenticated protected request", async () => { const token = await createSessionToken(secret); expect(await verifySessionToken(token, secret)).toBe(true); expect(await routeAuthDecision("/payments", token, secret)).toBe("allow"); });
  it("redirects an authenticated login request home", async () => { const token = await createSessionToken(secret); expect(await routeAuthDecision("/login", token, secret)).toBe("home"); });
  it("rejects tampered and expired sessions", async () => { const token = await createSessionToken(secret, 0); expect(await verifySessionToken(`${token}x`, secret)).toBe(false); expect(await verifySessionToken(token, secret, 31 * 24 * 60 * 60 * 1000)).toBe(false); });
  it("logout expires the HttpOnly session cookie", () => { const set = vi.fn(); clearSessionCookie({ set }, true); expect(set).toHaveBeenCalledWith(SESSION_COOKIE_NAME, "", expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 0 })); });
});
