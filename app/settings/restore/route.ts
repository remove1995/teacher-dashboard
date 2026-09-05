import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../../../lib/auth/session";
import { parseTutorFlowBackupJson } from "../../../lib/backup-format";
import { createTutorFlowBackup } from "../../../lib/services/backup-service";
import { restoreCounts, restoreSingleUserDatabase } from "../../../lib/services/restore-service";
import { prisma } from "../../../lib/db/prisma";

export const dynamic = "force-dynamic";
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value, process.env.TUTORFLOW_SESSION_SECRET);
  if (!authenticated) return NextResponse.json({ error: "Требуется повторный вход в TutorFlow." }, { status: 401 });

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BACKUP_BYTES) return NextResponse.json({ error: "Файл резервной копии слишком большой." }, { status: 413 });

  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BACKUP_BYTES) return NextResponse.json({ error: "Файл резервной копии слишком большой." }, { status: 413 });
    const validation = parseTutorFlowBackupJson(text);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    // This must succeed before the destructive transaction is allowed to start.
    const safetyBackup = await createTutorFlowBackup();
    const restored = await restoreSingleUserDatabase(prisma, validation.backup);
    return NextResponse.json({ ok: true, counts: restoreCounts(restored), preRestoreBackupCreatedAt: safetyBackup.createdAt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Восстановление не выполнено. Текущие данные не были заменены." }, { status: 500 });
  }
}
