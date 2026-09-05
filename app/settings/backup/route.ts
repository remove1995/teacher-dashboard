import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../../../lib/auth/session";
import { backupFileName, createTutorFlowBackup } from "../../../lib/services/backup-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value, process.env.TUTORFLOW_SESSION_SECRET);
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const createdAt = new Date();
    const backup = await createTutorFlowBackup(undefined, createdAt);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backupFileName(createdAt)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Backup generation failed" }, { status: 500 });
  }
}
