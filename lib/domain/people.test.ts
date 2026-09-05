import { describe, expect, it } from "vitest";
import { billableContextKeys, COHORT_EDITABLE_FIELDS, contextActiveInPeriod, hasIndividualLearningContext, normalizeTags, planMembershipChanges, resolveStudentListEntityType, STUDENT_EDITABLE_FIELDS, validateCohortParticipants } from "./people";

const augustStart = new Date("2026-08-01");
const augustEnd = new Date("2026-08-31");

describe("existing entity edits", () => {
  it("opens the Students list on Individual by default while preserving explicit tabs", () => {
    expect(resolveStudentListEntityType()).toBe("individual");
    expect(resolveStudentListEntityType("all")).toBe("all");
    expect(resolveStudentListEntityType("pair")).toBe("pair");
    expect(resolveStudentListEntityType("group")).toBe("group");
  });
  it("recognizes only explicit individual learning contexts", () => {
    expect(hasIndividualLearningContext({ individualSchedules: [{}], billingProfiles: [] })).toBe(true);
    expect(hasIndividualLearningContext({ individualSchedules: [], billingProfiles: [{}] })).toBe(true);
    expect(hasIndividualLearningContext({ individualSchedules: [], billingProfiles: [] })).toBe(false);
  });
  it("keeps creation and editing parity including learning-context controls", () => {
    expect(STUDENT_EDITABLE_FIELDS).toEqual(expect.arrayContaining(["name", "learningContexts", "contextBilling", "contextEffectiveFrom", "notesPrivate", "imageUrl"]));
  });
  it("keeps cohort memberships, defaults, and participant pricing editable", () => {
    expect(COHORT_EDITABLE_FIELDS).toEqual(expect.arrayContaining(["imageUrl", "memberships", "defaultRate", "participantBillingModel", "participantRate"]));
  });
  it("plans additions, removals, and retained memberships without recreating a cohort", () => {
    expect(planMembershipChanges(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], retained: ["b"], removed: ["a"] });
  });
  it("normalizes user-defined tags during both create and edit", () => expect(normalizeTags(" GoGetter, speaking, GoGetter ")).toEqual(["GoGetter", "speaking"]));
});

describe("billable learning contexts", () => {
  it("includes a new individual with billing even without a Payment record", () => expect(billableContextKeys({ studentId: "new", individualBillingActive: true, memberships: [] }, augustStart, augustEnd)).toEqual([{ key: "new:individual", kind: "INDIVIDUAL" }]));
  it("includes a pair participant under Pair payments", () => expect(billableContextKeys({ studentId: "adam", individualBillingActive: false, memberships: [{ cohortId: "pair", kind: "PAIR", activeFrom: augustStart, activeTo: null, billingActive: true }] }, augustStart, augustEnd)).toContainEqual({ key: "adam:pair", kind: "PAIR" }));
  it("includes a group participant under Group payments", () => expect(billableContextKeys({ studentId: "masha", individualBillingActive: false, memberships: [{ cohortId: "group", kind: "GROUP", activeFrom: augustStart, activeTo: null, billingActive: true }] }, augustStart, augustEnd)).toContainEqual({ key: "masha:group", kind: "GROUP" }));
  it("returns every simultaneous context independently", () => expect(billableContextKeys({ studentId: "multi", individualBillingActive: true, memberships: [{ cohortId: "pair", kind: "PAIR", activeFrom: augustStart, activeTo: null, billingActive: true }, { cohortId: "group", kind: "GROUP", activeFrom: augustStart, activeTo: null, billingActive: true }] }, augustStart, augustEnd)).toHaveLength(3));
  it("keeps a membership active for its historical period", () => expect(contextActiveInPeriod(new Date("2026-01-01"), new Date("2026-08-15"), augustStart, augustEnd)).toBe(true));
  it("does not create future expected charges after membership end", () => expect(contextActiveInPeriod(new Date("2026-01-01"), new Date("2026-08-31"), new Date("2026-09-01"), new Date("2026-09-30"))).toBe(false));
});

describe("pair and group participant creation", () => {
  it("accepts a group made from existing students", () => expect(validateCohortParticipants("GROUP", [{ mode: "existing", studentId: "a" }, { mode: "existing", studentId: "b" }])).toHaveLength(2));
  it("accepts a group mixing existing and new students", () => expect(validateCohortParticipants("GROUP", [{ mode: "existing", studentId: "a" }, { mode: "new", name: "Новый ученик" }])).toHaveLength(2));
  it("accepts a group made only from new students", () => expect(validateCohortParticipants("GROUP", [{ mode: "new", name: "Анна" }, { mode: "new", name: "Борис" }])).toHaveLength(2));
  it("supports a preselected profile student plus another participant", () => expect(validateCohortParticipants("GROUP", [{ mode: "existing", studentId: "profile-student" }, { mode: "new", name: "Второй участник" }])[0]).toMatchObject({ studentId: "profile-student" }));
  it("rejects the same existing student twice", () => expect(() => validateCohortParticipants("GROUP", [{ mode: "existing", studentId: "a" }, { mode: "existing", studentId: "a" }])).toThrow("cannot be added twice"));
  it("rejects duplicate new participant rows", () => expect(() => validateCohortParticipants("GROUP", [{ mode: "new", name: "Анна" }, { mode: "new", name: " анна " }])).toThrow("cannot be added twice"));
  it("keeps pair exact and group minimum rules without inventing a maximum", () => { expect(() => validateCohortParticipants("PAIR", [{ mode: "existing", studentId: "a" }])).toThrow(); expect(() => validateCohortParticipants("PAIR", [{ mode: "existing", studentId: "a" }, { mode: "existing", studentId: "b" }, { mode: "existing", studentId: "c" }])).toThrow(); expect(() => validateCohortParticipants("GROUP", [{ mode: "existing", studentId: "a" }])).toThrow(); expect(validateCohortParticipants("GROUP", Array.from({ length: 12 }, (_, index) => ({ mode: "existing" as const, studentId: `student-${index}` })))).toHaveLength(12); });
  it("plans one cohort membership change without touching other participants", () => expect(planMembershipChanges(["a", "b", "c"], ["a", "c", "d"])).toEqual({ added: ["d"], retained: ["a", "c"], removed: ["b"] }));
  it("does not mutate existing student data while validating membership", () => { const student = { id: "a", lessons: ["lesson"], finance: { balance: 100 }, learning: ["note"] }; const snapshot = structuredClone(student); validateCohortParticipants("GROUP", [{ mode: "existing", studentId: student.id }, { mode: "new", name: "Новый" }]); expect(student).toEqual(snapshot); });
});
