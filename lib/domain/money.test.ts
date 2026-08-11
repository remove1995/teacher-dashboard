import { describe, expect, it } from "vitest";
import {
  cashReceived, cumulativeReceived, earnedIncome, expectedForPaymentPeriod, filterFinanceRows,
  paymentAccountKey, paymentStatus, resolveEffectiveRate, resolveManualSuggestion, resolveProfileForPeriod, suggestPayment, currentPaymentVersions,
} from "./money";

describe("payment suggestions", () => {
  it("calculates individual monthly prepayment", () => expect(suggestPayment({ model: "MONTHLY_PREPAID", unitAmountMinor: 250000, scheduledLessonCount: 8 }).amountMinor).toBe(2000000));
  it("subtracts an explicit credit", () => expect(suggestPayment({ model: "MONTHLY_PREPAID", unitAmountMinor: 250000, scheduledLessonCount: 8, availableCreditMinor: 250000 })).toMatchObject({ amountMinor: 1750000, grossAmountMinor: 2000000, creditAppliedMinor: 250000 }));
  it("calculates weekly prepayment", () => expect(suggestPayment({ model: "WEEKLY_PREPAID", unitAmountMinor: 180000, scheduledLessonCount: 2 }).amountMinor).toBe(360000));
  it("calculates per-lesson billing from completed unpaid lessons", () => expect(suggestPayment({ model: "PAY_PER_LESSON", unitAmountMinor: 220000, completedUnpaidLessonCount: 3 }).amountMinor).toBe(660000));
  it("uses participant-specific group subscription price", () => expect(suggestPayment({ model: "GROUP_SUBSCRIPTION", unitAmountMinor: 300000, availableCreditMinor: 50000 }).amountMinor).toBe(250000));
  it("does not create group absence credits implicitly", () => expect(suggestPayment({ model: "GROUP_SUBSCRIPTION", unitAmountMinor: 450000, scheduledLessonCount: 1 }).amountMinor).toBe(450000));
});

describe("payment aggregation", () => {
  const payments = [
    { id: "one", actualAmountMinor: 500000, suggestedAmountMinor: 1200000, paymentDate: new Date("2026-08-01") },
    { id: "two", actualAmountMinor: 700000, suggestedAmountMinor: 1200000, paymentDate: new Date("2026-08-08") },
  ];
  it("derives partial, paid, and overpaid statuses", () => {
    expect(paymentStatus(1200000, 500000)).toBe("PARTIALLY_PAID");
    expect(paymentStatus(1200000, 1200000)).toBe("PAID");
    expect(paymentStatus(1200000, 1300000)).toBe("OVERPAID");
  });
  it("sums separate partial-payment records", () => expect(cumulativeReceived(payments)).toBe(1200000));
  it("counts expected amount once across multiple receipts", () => expect(expectedForPaymentPeriod(payments)).toBe(1200000));
  it("preserves a manually lowered expected amount instead of restoring the fallback", () => expect(expectedForPaymentPeriod([{ id: "manual", actualAmountMinor: 0, suggestedAmountMinor: 1100000 }], 1200000)).toBe(1100000));
  it("keeps correction history but uses only its latest record", () => expect(cumulativeReceived([...payments, { id: "fix", correctsPaymentId: "one", actualAmountMinor: 400000, suggestedAmountMinor: 1200000 }])).toBe(1100000));
  it("keeps pair participants in separate payment accounts", () => expect(paymentAccountKey("adam", "pair")).not.toBe(paymentAccountKey("daniel", "pair")));
  it("preserves receipt URLs on the current payment version", () => expect(currentPaymentVersions([{ id: "old", actualAmountMinor: 500, suggestedAmountMinor: 500, receiptUrl: "old" }, { id: "new", correctsPaymentId: "old", actualAmountMinor: 500, suggestedAmountMinor: 500, receiptUrl: "https://receipt.test/new" }])[0]).toMatchObject({ receiptUrl: "https://receipt.test/new" }));
});

describe("received and earned", () => {
  it("keeps received and earned totals separate", () => {
    expect(cashReceived([{ id: "p", actualAmountMinor: 2000000, suggestedAmountMinor: 2000000, paymentDate: new Date() }])).toBe(2000000);
    expect(earnedIncome([{ id: "l", status: "COMPLETED", valueMinor: 750000 }])).toBe(750000);
  });
  it("completed lesson earns and planned lesson does not", () => expect(earnedIncome([{ id: "done", status: "COMPLETED", valueMinor: 250000 }, { id: "future", status: "PLANNED", valueMinor: 250000 }])).toBe(250000));
  it("does not double-count a rescheduled service", () => expect(earnedIncome([{ id: "original", status: "RESCHEDULED", valueMinor: 250000 }, { id: "replacement", status: "COMPLETED", valueMinor: 250000, originalLessonId: "original" }])).toBe(250000));
  it("uses the historical effective profile", () => {
    const profiles = [{ amount: 200000, effectiveFrom: new Date("2026-08-01"), effectiveTo: new Date("2026-08-31") }, { amount: 250000, effectiveFrom: new Date("2026-09-01"), effectiveTo: null }];
    expect(resolveEffectiveRate(profiles, new Date("2026-08-15"))?.amount).toBe(200000);
  });
  it("finds a new billing profile that starts during the selected payment period", () => expect(resolveProfileForPeriod([{ id: "new", effectiveFrom: new Date("2026-08-11"), effectiveTo: null }], new Date("2026-08-01"), new Date("2026-08-31"))?.id).toBe("new"));
});

describe("overrides and filters", () => {
  it("preserves a manual suggestion and can return to calculated", () => {
    expect(resolveManualSuggestion(1200000, 1100000)).toEqual({ amountMinor: 1100000, manuallyOverridden: true });
    expect(resolveManualSuggestion(1200000, null)).toEqual({ amountMinor: 1200000, manuallyOverridden: false });
  });
  it("filters payment rows by entity type, status, and name", () => {
    const rows = [{ name: "Alina", kind: "INDIVIDUAL" as const, status: "PAID" as const }, { name: "Adam / Daniel", kind: "PAIR" as const, status: "PARTIALLY_PAID" as const }, { name: "GoGetter", kind: "GROUP" as const, status: "EXPECTED" as const }];
    expect(filterFinanceRows(rows, { kind: "PAIR" })).toEqual([rows[1]]);
    expect(filterFinanceRows(rows, { status: "EXPECTED" })).toEqual([rows[2]]);
    expect(filterFinanceRows(rows, { search: "ali" })).toEqual([rows[0]]);
  });
  it("finds a cohort by participant name", () => {
    const row = { name: "GoGetter", searchText: "GoGetter Masha Sonya", kind: "GROUP" as const, status: "EXPECTED" as const };
    expect(filterFinanceRows([row], { search: "masha" })).toEqual([row]);
  });
});
