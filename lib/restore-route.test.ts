import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE_NAME } from "./auth/session";
import { BACKUP_MODEL_NAMES, type TutorFlowBackupData } from "./backup-format";

const validEmptyBackup = () => ({ format: "tutorflow-backup" as const, version: 1 as const, createdAt: "2026-09-05T10:00:00.000Z", data: Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, []])) as unknown as TutorFlowBackupData });

const mocks = vi.hoisted(() => ({ createBackup: vi.fn(), restore: vi.fn() }));
vi.mock("./services/backup-service", async (original) => ({ ...(await original<Record<string, unknown>>()), createTutorFlowBackup: mocks.createBackup }));
vi.mock("./services/restore-service", async (original) => ({ ...(await original<Record<string, unknown>>()), restoreSingleUserDatabase: mocks.restore }));
import { POST } from "../app/settings/restore/route";

describe("settings restore endpoint", () => {
  const secret = "restore-test-secret-that-is-more-than-thirty-two-characters";
  beforeEach(() => { vi.clearAllMocks(); process.env.TUTORFLOW_SESSION_SECRET = secret; });

  it("requires authentication", async () => {
    const response = await POST(new NextRequest("http://localhost/settings/restore", { method: "POST", body: JSON.stringify(validEmptyBackup()) }));
    expect(response.status).toBe(401); expect(mocks.createBackup).not.toHaveBeenCalled(); expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("creates the pre-restore backup before starting restore", async () => {
    const candidate = validEmptyBackup();
    mocks.createBackup.mockResolvedValue({ ...candidate, createdAt: "2026-09-05T11:00:00.000Z" });
    mocks.restore.mockResolvedValue(candidate);
    const token = await createSessionToken(secret);
    const request = new NextRequest("http://localhost/settings/restore", { method: "POST", body: JSON.stringify(candidate), headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mocks.createBackup).toHaveBeenCalledOnce(); expect(mocks.restore).toHaveBeenCalledOnce();
    expect(mocks.createBackup.mock.invocationCallOrder[0]).toBeLessThan(mocks.restore.mock.invocationCallOrder[0]);
  });

  it("does not start restore when the pre-restore backup fails", async () => {
    const candidate = validEmptyBackup();
    mocks.createBackup.mockRejectedValue(new Error("backup unavailable"));
    const token = await createSessionToken(secret);
    const request = new NextRequest("http://localhost/settings/restore", { method: "POST", body: JSON.stringify(candidate), headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } });
    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(mocks.restore).not.toHaveBeenCalled();
  });
});
