import { describe, expect, it } from "vitest";
import { memberAttendsOccurrence, shouldRequestBillingEffectiveDate, validateMemberBilling } from "./member-billing";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("cohort member lifecycle", () => {
  const regular = { status: "REGULAR" as const, activeFrom: date("2026-09-01"), activeTo: null, trialLessonDate: null, regularFrom: date("2026-09-01") };
  const trial = { status: "TRIAL" as const, activeFrom: date("2026-09-01"), activeTo: null, trialLessonDate: date("2026-09-05") };

  it("includes a regular member in recurring lessons", () => expect(memberAttendsOccurrence(regular, date("2026-09-12"))).toBe(true));
  it("includes a trial member only in the selected lesson", () => {
    expect(memberAttendsOccurrence(trial, date("2026-09-05"))).toBe(true);
    expect(memberAttendsOccurrence(trial, date("2026-09-12"))).toBe(false);
  });
  it("does not include an ended trial in future lessons", () => expect(memberAttendsOccurrence({ ...trial, activeTo: date("2026-09-05") }, date("2026-09-12"))).toBe(false));
  it("preserves the trial date when conversion starts later", () => {
    const converted = { ...regular, activeFrom: date("2026-09-01"), trialLessonDate: date("2026-09-05"), regularFrom: date("2026-09-10") };
    expect(memberAttendsOccurrence(converted, date("2026-09-05"))).toBe(true);
    expect(memberAttendsOccurrence(converted, date("2026-09-07"))).toBe(false);
    expect(memberAttendsOccurrence(converted, date("2026-09-10"))).toBe(true);
  });
  it("requires one-off billing for a trial", () => expect(() => validateMemberBilling({ status: "TRIAL", model: "GROUP_SUBSCRIPTION", trialLessonDate: "2026-09-05" })).toThrow("разовая оплата"));
  it("requires a trial lesson date", () => expect(() => validateMemberBilling({ status: "TRIAL", model: "PAY_PER_LESSON", trialLessonDate: null })).toThrow("дату"));
  it("accepts a paid one-off trial", () => expect(() => validateMemberBilling({ status: "TRIAL", model: "PAY_PER_LESSON", trialLessonDate: "2026-09-05" })).not.toThrow());
  it("does not classify a cohort-only trial as individual", async () => {
    const { hasIndividualLearningContext } = await import("./people");
    expect(hasIndividualLearningContext({ individualSchedules: [], billingProfiles: [] })).toBe(false);
  });
});

describe("member billing effective-date UX", () => {
  const unchanged = { isExisting: true, status: "REGULAR" as const, initialModel: "GROUP_SUBSCRIPTION", initialAmountMinor: 450000, model: "GROUP_SUBSCRIPTION", amountMinor: 450000 };
  it("hides the date for an unchanged existing member", () => expect(shouldRequestBillingEffectiveDate(unchanged)).toBe(false));
  it("shows the date after changing the price", () => expect(shouldRequestBillingEffectiveDate({ ...unchanged, amountMinor: 400000 })).toBe(true));
  it("shows the date after changing the billing model", () => expect(shouldRequestBillingEffectiveDate({ ...unchanged, model: "MONTHLY_PREPAID" })).toBe(true));
  it("hides the date for a new regular member", () => expect(shouldRequestBillingEffectiveDate({ ...unchanged, isExisting: false, initialModel: undefined, initialAmountMinor: undefined })).toBe(false));
  it("uses only the separate trial date for a trial member", () => expect(shouldRequestBillingEffectiveDate({ ...unchanged, status: "TRIAL", amountMinor: 150000 })).toBe(false));
});
