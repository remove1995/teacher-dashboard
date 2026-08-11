import { describe, expect, it } from "vitest";
import { billableContextKeys, COHORT_EDITABLE_FIELDS, contextActiveInPeriod, normalizeTags, planMembershipChanges, STUDENT_EDITABLE_FIELDS } from "./people";

const augustStart = new Date("2026-08-01");
const augustEnd = new Date("2026-08-31");

describe("existing entity edits", () => {
  it("keeps creation and editing parity including learning-context controls", () => {
    expect(STUDENT_EDITABLE_FIELDS).toEqual(expect.arrayContaining(["name", "learningContexts", "contextBilling", "contextEffectiveFrom", "notesPrivate", "imageUrl"]));
  });
  it("keeps cohort memberships, defaults, and participant pricing editable", () => {
    expect(COHORT_EDITABLE_FIELDS).toEqual(expect.arrayContaining(["memberships", "defaultRate", "participantBillingModel", "participantRate"]));
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
