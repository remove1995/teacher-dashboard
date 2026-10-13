import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { BACKUP_MODEL_NAMES, BACKUP_SCALAR_FIELDS, type BackupModelName, type BackupRow, type TutorFlowBackupData } from "../backup-format";
import { restoreSingleUserDatabase } from "./restore-service";

const delegateNames: Record<BackupModelName, string> = Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, name[0].toLowerCase() + name.slice(1)])) as Record<BackupModelName, string>;
const emptyData = () => Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, []])) as unknown as TutorFlowBackupData;
const row = (name: BackupModelName, values: BackupRow) => Object.fromEntries(BACKUP_SCALAR_FIELDS[name].map((field) => [field, values[field] ?? null])) as BackupRow;
const backup = (data = emptyData()) => ({ format: "tutorflow-backup" as const, version: 1 as const, createdAt: "2026-09-05T10:00:00.000Z", data });

function fakeDatabase(initial: Partial<Record<BackupModelName, BackupRow[]>> = {}, failCreate?: BackupModelName) {
  const state = Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, structuredClone(initial[name] ?? [])])) as Record<BackupModelName, BackupRow[]>;
  const delegates = Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [delegateNames[name], {
    deleteMany: async () => { state[name] = []; return { count: 0 }; },
    updateMany: async ({ data }: { data: BackupRow }) => { state[name] = state[name].map((item) => ({ ...item, ...data })); return { count: state[name].length }; },
    createMany: async ({ data }: { data: BackupRow[] }) => { if (name === failCreate) throw new Error("injected failure"); if (name === "ExtraIncome" && data.some((row) => !state.IncomeTag.some((tag) => tag.id === row.tagId))) throw new Error("missing income category"); state[name] = structuredClone(data); return { count: data.length }; },
    update: async ({ where, data }: { where: { id: string }; data: BackupRow }) => { const item = state[name].find((candidate) => candidate.id === where.id); if (!item) throw new Error("missing row"); Object.assign(item, data); return item; },
  }])) as Record<string, unknown>;
  const client = {
    ...delegates,
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => {
      const snapshot = structuredClone(state);
      try { return await operation(client); }
      catch (error) { for (const name of BACKUP_MODEL_NAMES) state[name] = snapshot[name]; throw error; }
    },
  } as unknown as PrismaClient;
  return { client, state };
}

describe("TutorFlow full-replace restore", () => {
  const category = () => row("IncomeTag", { id: "category", name: "Материалы", normalizedName: "материалы", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" });
  const income = () => row("ExtraIncome", { id: "income", tagId: "category", amountMinor: 350025, receivedAt: "2026-10-04T00:00:00.000Z", title: "What's The Place?", receiptUrl: "https://example.com/receipt", comment: "Продажа", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" });
  it("restores independent income IDs, category relations, dates and minor units", async () => {
    const data = emptyData(); data.IncomeTag.push(category()); data.ExtraIncome.push(income());
    const database = fakeDatabase({ ExtraIncome: [{ id: "old-income" }], IncomeTag: [{ id: "old-tag" }] });
    await restoreSingleUserDatabase(database.client, backup(data));
    expect(database.state.ExtraIncome).toEqual([income()]);
    expect(database.state.IncomeTag).toEqual([category()]);
  });
  it("restores older v1 snapshots with new models empty in full-replace mode", async () => {
    const candidate = backup();
    delete (candidate.data as Partial<TutorFlowBackupData>).ExtraIncome; delete (candidate.data as Partial<TutorFlowBackupData>).IncomeTag;
    const database = fakeDatabase({ ExtraIncome: [income()], IncomeTag: [category()] });
    await restoreSingleUserDatabase(database.client, candidate);
    expect(database.state.ExtraIncome).toEqual([]); expect(database.state.IncomeTag).toEqual([]);
  });
  it("rolls income/category replacement back if income insertion fails", async () => {
    const data = emptyData(); data.IncomeTag.push(category()); data.ExtraIncome.push(income());
    const database = fakeDatabase({ ExtraIncome: [income()], IncomeTag: [category()] }, "ExtraIncome");
    await expect(restoreSingleUserDatabase(database.client, backup(data))).rejects.toThrow("injected failure");
    expect(database.state.ExtraIncome).toEqual([income()]); expect(database.state.IncomeTag).toEqual([category()]);
  });
  it("replaces existing records and preserves original IDs and relations", async () => {
    const data = emptyData();
    data.Student.push(row("Student", { id: "student-new" }));
    data.Cohort.push(row("Cohort", { id: "cohort-new" }));
    data.CohortMembership.push(row("CohortMembership", { id: "membership-new", studentId: "student-new", cohortId: "cohort-new" }));
    const database = fakeDatabase({ Student: [row("Student", { id: "student-old" })] });

    await restoreSingleUserDatabase(database.client, backup(data));

    expect(database.state.Student.map(({ id }) => id)).toEqual(["student-new"]);
    expect(database.state.CohortMembership[0]).toMatchObject({ id: "membership-new", studentId: "student-new", cohortId: "cohort-new" });
  });

  it("restores self-referencing lesson and payment links in a second phase", async () => {
    const data = emptyData();
    data.Student.push(row("Student", { id: "student-1" }));
    data.Lesson.push(row("Lesson", { id: "lesson-original", studentId: "student-1" }), row("Lesson", { id: "lesson-replacement", studentId: "student-1", originalLessonId: "lesson-original" }));
    data.Payment.push(row("Payment", { id: "payment-original", studentId: "student-1" }), row("Payment", { id: "payment-correction", studentId: "student-1", correctsPaymentId: "payment-original" }));
    const database = fakeDatabase();
    await restoreSingleUserDatabase(database.client, backup(data));
    expect(database.state.Lesson.find(({ id }) => id === "lesson-replacement")?.originalLessonId).toBe("lesson-original");
    expect(database.state.Payment.find(({ id }) => id === "payment-correction")?.correctsPaymentId).toBe("payment-original");
  });

  it("rolls the entire replacement back when an insert fails", async () => {
    const current = row("Student", { id: "student-current" });
    const data = emptyData(); data.Student.push(row("Student", { id: "student-new" })); data.Cohort.push(row("Cohort", { id: "cohort-new" }));
    const database = fakeDatabase({ Student: [current] }, "Cohort");
    await expect(restoreSingleUserDatabase(database.client, backup(data))).rejects.toThrow("injected failure");
    expect(database.state.Student).toEqual([current]);
  });
});
