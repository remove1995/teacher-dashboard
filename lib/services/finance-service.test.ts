import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ student: { findMany: vi.fn() }, cohort: { findMany: vi.fn() }, lesson: { findMany: vi.fn() }, credit: { findMany: vi.fn() }, payment: { findMany: vi.fn() } }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/domain/money", async () => import("../domain/money"));
vi.mock("@/lib/domain/people", async () => import("../domain/people"));
vi.mock("@/lib/domain/member-billing", async () => import("../domain/member-billing"));
import { getFinanceWorkspace, monthPeriod } from "./finance-service";

const date = (day: number) => new Date(Date.UTC(2026, 9, day));
const period = monthPeriod("2026-10");
const profile = (studentId: string, model = "MONTHLY_PREPAID", amountMinor = 150000) => ({ id: `billing-${studentId}`, studentId, cohortId: "pair", model, amountMinor, effectiveFrom: date(1), effectiveTo: null });
const member = (id: string, model = "MONTHLY_PREPAID", amountMinor = 150000) => ({ id: `member-${id}`, studentId: id, activeFrom: date(1), activeTo: null, status: "REGULAR", trialLessonDate: null, regularFrom: null, billingProfiles: [profile(id, model, amountMinor)], student: { id, name: id, color: "#83916f", billingProfiles: [] } });
const lesson = (id: string, status = "COMPLETED", originalLessonId: string | null = null) => ({ id, studentId: null, cohortId: "pair", scheduledDate: date(5), status, originalLessonId });
const payment = (studentId: string, actualAmountMinor = 750000) => ({ id: `pay-${studentId}`, studentId, cohortId: "pair", billingModel: "MONTHLY_PREPAID", periodStart: date(1), periodEnd: date(31), paymentDate: date(3), actualAmountMinor, suggestedAmountMinor: 1200000, manuallyOverridden: false, correctsPaymentId: null, comment: null, receiptUrl: null });

beforeEach(() => {
  vi.clearAllMocks();
  db.student.findMany.mockResolvedValue([]);
  db.cohort.findMany.mockResolvedValue([{ id: "pair", name: "Pair", kind: "PAIR", color: "#83916f", memberships: [member("a"), member("b", "MONTHLY_PREPAID", 200000)] }]);
  db.lesson.findMany.mockResolvedValue(Array.from({ length: 8 }, (_, i) => lesson(`lesson-${i}`, i < 3 ? "CANCELLED" : "COMPLETED")));
  db.payment.findMany.mockResolvedValue([payment("a"), payment("b", 1000000)]);
  db.credit.findMany.mockResolvedValue([]);
});

describe("billable occurrences in the real finance workspace", () => {
  it("reconciles 8 planned minus 3 cancellations against payment for 5 per participant", async () => {
    const result = await getFinanceWorkspace(period);
    expect(result.rows[0]).toMatchObject({ expectedMinor: 1750000, receivedMinor: 1750000, balanceMinor: 0, status: "PAID" });
    expect(result.rows[0].participants.map((p) => [p.lessonCount, p.expectedMinor, p.status])).toEqual([[5, 750000, "PAID"], [5, 1000000, "PAID"]]);
    expect(result.summary).toMatchObject({ outstandingMinor: 0, receivedMinor: 1750000, earnedMinor: 1750000 });
    expect(db.payment.findMany).toHaveBeenCalledOnce();
  });

  it("planned lessons are expected but cancelled/planned lessons are not earned", async () => {
    db.lesson.findMany.mockResolvedValue([lesson("done"), lesson("future", "PLANNED"), lesson("cancel", "CANCELLED")]);
    const result = await getFinanceWorkspace(period);
    expect(result.summary).toMatchObject({ expectedMinor: 700000, earnedMinor: 350000 });
  });

  it("rescheduled original and completed replacement are one service", async () => {
    db.lesson.findMany.mockResolvedValue([lesson("original", "RESCHEDULED"), lesson("replacement", "COMPLETED", "original")]);
    const result = await getFinanceWorkspace(period);
    expect(result.summary).toMatchObject({ expectedMinor: 350000, earnedMinor: 350000 });
  });

  it("does not earn the same completed service twice", async () => {
    db.lesson.findMany.mockResolvedValue([lesson("original"), lesson("replacement", "COMPLETED", "original")]);
    expect((await getFinanceWorkspace(period)).summary).toMatchObject({ expectedMinor: 350000, earnedMinor: 350000 });
  });

  it("participant absence does not remove a group charge or create credit", async () => {
    db.cohort.findMany.mockResolvedValue([{ id: "pair", name: "Group", kind: "GROUP", color: "#83916f", memberships: [member("a"), member("b")] }]);
    db.lesson.findMany.mockResolvedValue([{ ...lesson("occurred"), attendance: [{ studentId: "a", status: "ABSENT" }] }]);
    const result = await getFinanceWorkspace(period);
    expect(result.summary).toMatchObject({ expectedMinor: 300000, earnedMinor: 300000, creditMinor: 0 });
  });

  it("preserves explicit manual expectations rather than automatic snapshots", async () => {
    db.payment.findMany.mockResolvedValue([{ ...payment("a"), suggestedAmountMinor: 500000, manuallyOverridden: true }]);
    expect((await getFinanceWorkspace(period)).rows[0].participants[0].expectedMinor).toBe(500000);
  });

  it("preserves applied credit after cancellation and receipt correction", async () => {
    db.payment.findMany.mockResolvedValue([payment("a"), { ...payment("a", 600000), id: "corrected", correctsPaymentId: "pay-a" }]);
    db.credit.findMany.mockResolvedValue([{ studentId: "a", status: "APPLIED", amountMinor: 150000, destinationPaymentId: "pay-a", sourcePaymentId: null, destinationPeriodLabel: period.label }]);
    expect((await getFinanceWorkspace(period)).rows[0].participants[0]).toMatchObject({ expectedMinor: 600000, receivedMinor: 600000, balanceMinor: 0, status: "PAID" });
  });

  it.each(["MONTHLY_PREPAID", "WEEKLY_PREPAID"])("%s excludes cancelled individual services", async (model) => {
    db.cohort.findMany.mockResolvedValue([]);
    db.student.findMany.mockResolvedValue([{ id: "a", name: "A", color: "#83916f", memberships: [], billingProfiles: [{ ...profile("a", model), cohortId: null }] }]);
    db.lesson.findMany.mockResolvedValue([lesson("done"), lesson("cancel", "CANCELLED")].map((l) => ({ ...l, studentId: "a", cohortId: null })));
    db.payment.findMany.mockResolvedValue([{ ...payment("a", 150000), cohortId: null, billingModel: model }]);
    expect((await getFinanceWorkspace(period)).rows[0]).toMatchObject({ expectedMinor: 150000, balanceMinor: 0, status: "PAID" });
  });

  it("fixed group subscription stays fixed and is earned only by completed services", async () => {
    db.cohort.findMany.mockResolvedValue([{ id: "pair", name: "Group", kind: "GROUP", color: "#83916f", memberships: [member("a", "GROUP_SUBSCRIPTION", 600000)] }]);
    db.payment.findMany.mockResolvedValue([]);
    const result = await getFinanceWorkspace(period);
    expect(result.summary).toMatchObject({ expectedMinor: 600000, earnedMinor: 600000 });
  });
});
