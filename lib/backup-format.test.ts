import { describe, expect, it } from "vitest";
import { BACKUP_MODEL_NAMES, backupPreview, parseTutorFlowBackupJson, validateTutorFlowBackup, type TutorFlowBackupData } from "./backup-format";

export const emptyBackupData = () => Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, []])) as unknown as TutorFlowBackupData;
export const validEmptyBackup = () => ({ format: "tutorflow-backup" as const, version: 1 as const, createdAt: "2026-09-05T10:00:00.000Z", data: emptyBackupData() });

describe("TutorFlow backup v1 validation", () => {
  it("accepts a valid v1 backup", () => expect(validateTutorFlowBackup(validEmptyBackup()).ok).toBe(true));
  it("normalizes older v1 backups without other-income sections without mutating input", () => {
    const backup = validEmptyBackup();
    delete (backup.data as Partial<TutorFlowBackupData>).IncomeTag;
    delete (backup.data as Partial<TutorFlowBackupData>).ExtraIncome;
    const result = validateTutorFlowBackup(backup);
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.backup.data.IncomeTag).toEqual([]); expect(result.backup.data.ExtraIncome).toEqual([]); }
    expect(backup.data).not.toHaveProperty("ExtraIncome");
  });
  it("validates category/income relations, money, dates and preview counts", () => {
    const backup = validEmptyBackup();
    backup.data.IncomeTag.push({ id: "income-tag", name: "Материалы", normalizedName: "материалы", createdAt: backup.createdAt, updatedAt: backup.createdAt });
    backup.data.ExtraIncome.push({ id: "income", tagId: "income-tag", amountMinor: 350025, receivedAt: "2026-10-04T00:00:00.000Z", title: "What's The Place?", receiptUrl: "https://example.com/receipt", comment: "Продажа комплекта", createdAt: backup.createdAt, updatedAt: backup.createdAt });
    expect(validateTutorFlowBackup(backup).ok).toBe(true);
    expect(backupPreview(backup)).toMatchObject({ extraIncomes: 1, incomeTags: 1 });
    const invalid = structuredClone(backup); invalid.data.ExtraIncome[0].tagId = "missing";
    expect(validateTutorFlowBackup(invalid).ok).toBe(false);
    for (const changes of [{ amountMinor: -1 }, { amountMinor: 0.5 }, { receivedAt: "invalid" }, { title: " " }, { receiptUrl: "javascript:alert(1)" }]) {
      const candidate = structuredClone(backup); Object.assign(candidate.data.ExtraIncome[0], changes);
      expect(validateTutorFlowBackup(candidate).ok).toBe(false);
    }
    backup.data.IncomeTag.push({ ...backup.data.IncomeTag[0], id: "duplicate-category" });
    expect(validateTutorFlowBackup(backup).ok).toBe(false);
  });
  it("accepts legacy v1 tags without suggestion visibility metadata", () => {
    const backup = validEmptyBackup();
    backup.data.Tag.push({ id: "tag-1", name: "Speaking" });
    expect(validateTutorFlowBackup(backup).ok).toBe(true);
  });
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
