import { describe, expect, it } from "vitest";
import { combinedMonthlyCash, incomeAmountMinor, incomeDate, monthlyExtraIncomeTotal, normalizeIncomeCategory, validateExtraIncome } from "./extra-income";

describe("other income domain", () => {
  it("sums actual cash only inside the selected month, including its boundaries", () => {
    const rows = [{ amountMinor: 100, receivedAt: incomeDate("2026-10-01") }, { amountMinor: 250, receivedAt: incomeDate("2026-10-31") }, { amountMinor: 900, receivedAt: incomeDate("2026-09-30") }, { amountMinor: 800, receivedAt: incomeDate("2026-11-01") }];
    expect(monthlyExtraIncomeTotal(rows, incomeDate("2026-10-01"), incomeDate("2026-10-31"))).toBe(350);
    expect(monthlyExtraIncomeTotal([], incomeDate("2026-10-01"), incomeDate("2026-10-31"))).toBe(0);
  });
  it("combines only two actual cash values, without credits or accrued income", () => expect(combinedMonthlyCash(1000, 350)).toEqual({ studentReceivedMinor: 1000, otherReceivedMinor: 350, totalReceivedMinor: 1350 }));
  it("normalizes case, surrounding/repeated whitespace and Unicode variants", () => {
    expect(normalizeIncomeCategory("  Продажа   ИГРЫ  ")).toBe(normalizeIncomeCategory("продажа игры"));
    expect(normalizeIncomeCategory("ＹｏｕＴｕｂｅ")).toBe("youtube");
  });
  it("parses amounts in integer minor units without floating-point rounding", () => { expect(incomeAmountMinor("1 234,56")).toBe(123456); expect(incomeAmountMinor("0.29")).toBe(29); });
  it.each(["", "0", "-1", "1.001", "1e3", "21474836.48"])("rejects invalid amount %s", (value) => expect(() => incomeAmountMinor(value)).toThrow());
  it.each(["2026-02-30", "invalid", "2026-13-01", "2026-1-1"])("rejects invalid date %s", (value) => expect(() => incomeDate(value)).toThrow());
  it("requires title/category and safe receipt URL", () => {
    const valid = { amountMinor: 100, receivedAt: incomeDate("2026-10-01"), title: " Sale ", category: " Materials " };
    expect(validateExtraIncome(valid)).toMatchObject({ title: "Sale", category: "Materials", receiptUrl: null, comment: null });
    for (const invalid of [{ ...valid, title: " " }, { ...valid, category: " " }, { ...valid, receiptUrl: "javascript:alert(1)" }, { ...valid, amountMinor: 1.5 }]) expect(() => validateExtraIncome(invalid)).toThrow();
  });
});
