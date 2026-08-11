import { describe, expect, it } from "vitest";
import { cashReceived, earnedIncome, paymentStatus, suggestPayment } from "./money";

describe("payment suggestions", () => {
  it("subtracts available credit from monthly prepaid lessons", () => expect(suggestPayment({ model: "MONTHLY_PREPAID", unitAmountMinor: 250000, scheduledLessonCount: 8, availableCreditMinor: 250000 })).toMatchObject({ amountMinor: 1750000, grossAmountMinor: 2000000, creditAppliedMinor: 250000 }));
  it("calculates weekly prepaid from scheduled lessons", () => expect(suggestPayment({ model: "WEEKLY_PREPAID", unitAmountMinor: 180000, scheduledLessonCount: 2 }).amountMinor).toBe(360000));
  it("calculates pay per lesson only from completed unpaid lessons", () => expect(suggestPayment({ model: "PAY_PER_LESSON", unitAmountMinor: 220000, completedUnpaidLessonCount: 3 }).amountMinor).toBe(660000));
  it("uses participant subscription price directly", () => expect(suggestPayment({ model: "GROUP_SUBSCRIPTION", unitAmountMinor: 300000, scheduledLessonCount: 8 }).amountMinor).toBe(300000));
});

describe("financial state", () => {
  it("recognizes a partial payment", () => expect(paymentStatus(2000000, 1000000)).toBe("PARTIALLY_PAID"));
  it("keeps cash and earned income separate while deduplicating one rescheduled service", () => { expect(cashReceived([{ actualAmountMinor: 1000000, status: "PARTIALLY_PAID" }])).toBe(1000000); expect(earnedIncome([{ id: "original", status: "COMPLETED", valueMinor: 250000, originalLessonId: null }, { id: "replacement", status: "COMPLETED", valueMinor: 250000, originalLessonId: "original" }])).toBe(250000); });
  it("counts a completed replacement when the original was only marked rescheduled", () => expect(earnedIncome([{ id: "original", status: "RESCHEDULED", valueMinor: 250000 }, { id: "replacement", status: "COMPLETED", valueMinor: 250000, originalLessonId: "original" }])).toBe(250000));
});
