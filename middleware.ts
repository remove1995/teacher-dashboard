import { NextRequest, NextResponse } from "next/server";
import { routeAuthDecision, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const decision = await routeAuthDecision(request.nextUrl.pathname, request.cookies.get(SESSION_COOKIE_NAME)?.value, process.env.TUTORFLOW_SESSION_SECRET);
  if (decision === "allow") return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = decision === "home" ? "/" : "/login";
  destination.search = "";
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/", "/login", "/students/:path*", "/lessons/:path*", "/calendar/:path*", "/attendance/:path*", "/payments/:path*", "/settings/:path*", "/cohorts/:path*", "/schedules/:path*"],
};
