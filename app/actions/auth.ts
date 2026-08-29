"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateAndCreateSession, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

export type LoginState = { error: string | null };
const failures = new Map<string, { count: number; lastAttempt: number }>();
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const requestHeaders = await headers();
  const clientKey = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "single-user";
  const previous = failures.get(clientKey);
  const recentCount = previous && Date.now() - previous.lastAttempt < 15 * 60_000 ? previous.count : 0;
  await wait(650 + Math.min(recentCount, 5) * 350);

  const password = String(formData.get("password") ?? "");
  const passwordHash = process.env.TUTORFLOW_PASSWORD_HASH;
  const sessionSecret = process.env.TUTORFLOW_SESSION_SECRET;
  const hashParts = passwordHash?.split("$") ?? [];
  const hashFormatValid = hashParts.length === 6
    && hashParts[0] === "scrypt"
    && Number.isInteger(Number(hashParts[1]))
    && Number(hashParts[1]) >= 16384
    && Number.isInteger(Number(hashParts[2]))
    && Number(hashParts[2]) >= 8
    && Number.isInteger(Number(hashParts[3]))
    && Number(hashParts[3]) >= 1
    && Boolean(hashParts[4])
    && Boolean(hashParts[5]);
  const passwordVerified = passwordHash ? await verifyPassword(password, passwordHash) : false;

  console.info("AUTH_DEBUG");
  console.info(`hashPresent: ${Boolean(passwordHash)}`);
  console.info(`sessionSecretPresent: ${Boolean(sessionSecret)}`);
  console.info(`hashFormatValid: ${hashFormatValid}`);
  console.info(`passwordVerified: ${passwordVerified}`);

  const token = await authenticateAndCreateSession(password, passwordHash, sessionSecret);
  if (!token) {
    failures.set(clientKey, { count: recentCount + 1, lastAttempt: Date.now() });
    return { error: "Неверный пароль" };
  }

  failures.delete(clientKey);
  const cookieStore = await cookies();
  setSessionCookie(cookieStore, token, process.env.NODE_ENV === "production");
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  clearSessionCookie(cookieStore, process.env.NODE_ENV === "production");
  redirect("/login");
}
