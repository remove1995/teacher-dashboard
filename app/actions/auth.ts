"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateAndCreateSession, effectivePasswordHash } from "@/lib/auth/password";
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
  const passwordHash = effectivePasswordHash();
  const sessionSecret = process.env.TUTORFLOW_SESSION_SECRET;

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
