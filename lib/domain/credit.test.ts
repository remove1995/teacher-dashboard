import { describe, expect, it } from "vitest";
import { canCreateCredit } from "./credit";

describe("credit eligibility", () => {
  it("requires payment, no makeup, and teacher confirmation", () => { expect(canCreateCredit({ lessonWasPaid: true, willBeMadeUp: false, teacherConfirmed: true, context: "INDIVIDUAL" })).toBe(true); expect(canCreateCredit({ lessonWasPaid: true, willBeMadeUp: false, teacherConfirmed: false, context: "INDIVIDUAL" })).toBe(false); });
  it("does not credit group absence when the group lesson happened", () => expect(canCreateCredit({ lessonWasPaid: true, willBeMadeUp: false, teacherConfirmed: true, context: "GROUP_SUBSCRIPTION", groupLessonTookPlace: true })).toBe(false));
});
