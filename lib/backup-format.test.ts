import { describe, expect, it } from "vitest";
import { BACKUP_MODEL_NAMES, backupPreview, parseTutorFlowBackupJson, validateTutorFlowBackup, type TutorFlowBackupData } from "./backup-format";

export const emptyBackupData = () => Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, []])) as unknown as TutorFlowBackupData;
export const validEmptyBackup = () => ({ format: "tutorflow-backup" as const, version: 1 as const, createdAt: "2026-09-05T10:00:00.000Z", data: emptyBackupData() });

describe("TutorFlow backup v1 validation", () => {
  it("accepts a valid v1 backup", () => expect(validateTutorFlowBackup(validEmptyBackup()).ok).toBe(true));
  it("rejects invalid JSON", () => expect(parseTutorFlowBackupJson("{broken")).toEqual({ ok: false, error: "Не удалось прочитать JSON-файл." }));
  it("rejects a wrong format", () => expect(validateTutorFlowBackup({ ...validEmptyBackup(), format: "other" }).ok).toBe(false));
  it("rejects an unsupported version", () => expect(validateTutorFlowBackup({ ...validEmptyBackup(), version: 2 }).ok).toBe(false));
  it("rejects missing model sections", () => { const backup = validEmptyBackup(); delete (backup.data as Partial<TutorFlowBackupData>).Lesson; expect(validateTutorFlowBackup(backup).ok).toBe(false); });
  it("rejects secret or unknown fields instead of restoring them", () => {
    const backup = validEmptyBackup();
    backup.data.TeacherSettings.push({ id: "primary", displayName: "Маша", avatarUrl: null, timezone: "Europe/Moscow", defaultLessonDuration: 60, currency: "RUB", createdAt: backup.createdAt, updatedAt: backup.createdAt, TUTORFLOW_SESSION_SECRET: "forbidden" });
    expect(validateTutorFlowBackup(backup).ok).toBe(false);
  });
  it("calculates preview counts", () => {
    const backup = validEmptyBackup();
    backup.data.Student.push({}); backup.data.Student.push({}); backup.data.Cohort.push({}); backup.data.Lesson.push({}); backup.data.Payment.push({}); backup.data.LearningRecord.push({}); backup.data.TestResult.push({});
    expect(backupPreview(backup)).toMatchObject({ version: 1, students: 2, cohorts: 1, lessons: 1, payments: 1, learningRecords: 2 });
  });
});
