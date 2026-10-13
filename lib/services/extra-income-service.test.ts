import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { incomeDate, normalizeIncomeCategory } from "../domain/extra-income";
import { deleteExtraIncomeRecord, getExtraIncomeWorkspace, saveExtraIncomeRecord } from "./extra-income-service";
import { createTutorFlowBackup } from "./backup-service";

const db = new PrismaClient();
afterAll(() => db.$disconnect());
const input = (category: string) => ({ title: "Income regression fixture", category, amountMinor: 12345, receivedAt: incomeDate("2098-10-01"), receiptUrl: "https://example.com/receipt", comment: "fixture" });

describe("independent income persistence", () => {
  it("creates/reuses normalized categories, updates existing income and deletes only the selected row", async () => {
    const category = `Income ${crypto.randomUUID()}`;
    const ids: string[] = [];
    try {
      const first = await saveExtraIncomeRecord(null, input(category), db); ids.push(first.id);
      const second = await saveExtraIncomeRecord(null, input(`  ${category.toUpperCase()}  `), db); ids.push(second.id);
      expect(first.tagId).toBe(second.tagId);
      const exported = await createTutorFlowBackup(db);
      expect(exported.data.IncomeTag.find((row) => row.id === first.tagId)?.normalizedName).toBe(normalizeIncomeCategory(category));
      expect(exported.data.ExtraIncome.find((row) => row.id === first.id)).toMatchObject({ tagId: first.tagId, title: input(category).title, amountMinor: 12345, receivedAt: "2098-10-01T00:00:00.000Z", receiptUrl: "https://example.com/receipt", comment: "fixture" });
      expect(await db.incomeTag.count({ where: { normalizedName: normalizeIncomeCategory(category) } })).toBe(1);
      const updated = await saveExtraIncomeRecord(first.id, { ...input(category), title: "Changed", amountMinor: 25000, receivedAt: incomeDate("2098-10-31"), receiptUrl: null, comment: "Updated" }, db);
      expect(updated).toMatchObject({ id: first.id, title: "Changed", amountMinor: 25000, receivedAt: incomeDate("2098-10-31"), comment: "Updated", receiptUrl: null });
      expect(await db.extraIncome.count({ where: { id: { in: ids } } })).toBe(2);
      await expect(db.incomeTag.delete({ where: { id: first.tagId } })).rejects.toThrow();
      await deleteExtraIncomeRecord(first.id, db);
      expect(await db.extraIncome.findUnique({ where: { id: first.id } })).toBeNull();
      expect(await db.extraIncome.findUnique({ where: { id: second.id } })).not.toBeNull();
      expect(await db.incomeTag.findUnique({ where: { id: first.tagId } })).not.toBeNull();
    } finally {
      await db.extraIncome.deleteMany({ where: { id: { in: ids } } });
      await db.incomeTag.deleteMany({ where: { normalizedName: normalizeIncomeCategory(category) } });
    }
  });
  it("queries only the selected month and preserves date/amount boundaries", async () => {
    const category = `Month ${crypto.randomUUID()}`;
    const ids: string[] = [];
    try {
      for (const day of ["2098-09-30", "2098-10-01", "2098-10-31", "2098-11-01"]) ids.push((await saveExtraIncomeRecord(null, { ...input(category), receivedAt: incomeDate(day) }, db)).id);
      const workspace = await getExtraIncomeWorkspace({ start: incomeDate("2098-10-01"), end: incomeDate("2098-10-31") }, db);
      expect(workspace.records.filter((row) => ids.includes(row.id)).map((row) => row.receivedAt.toISOString().slice(0, 10))).toEqual(["2098-10-31", "2098-10-01"]);
      expect(workspace.records.filter((row) => ids.includes(row.id)).reduce((sum, row) => sum + row.amountMinor, 0)).toBe(24690);
    } finally {
      await db.extraIncome.deleteMany({ where: { id: { in: ids } } });
      await db.incomeTag.deleteMany({ where: { normalizedName: normalizeIncomeCategory(category) } });
    }
  });
  it("validates before writes and rolls back a new category when an update target is missing", async () => {
    const category = `Rollback ${crypto.randomUUID()}`;
    await expect(saveExtraIncomeRecord(null, { ...input(category), amountMinor: -1 }, db)).rejects.toThrow();
    await expect(saveExtraIncomeRecord("missing-income-id", input(category), db)).rejects.toThrow();
    expect(await db.incomeTag.count({ where: { normalizedName: normalizeIncomeCategory(category) } })).toBe(0);
  });
});
