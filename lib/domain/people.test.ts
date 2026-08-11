import { describe, expect, it } from "vitest";
import { COHORT_EDITABLE_FIELDS, normalizeTags, planMembershipChanges, STUDENT_EDITABLE_FIELDS } from "./people";

describe("existing entity edits", () => {
  it("keeps creation and editing parity for every required student field", () => {
    expect(STUDENT_EDITABLE_FIELDS).toEqual(["name", "yearOrLevel", "status", "color", "tags", "billingModel", "rate", "notesPrivate", "imageUrl"]);
  });
  it("keeps cohort memberships, defaults, and participant pricing editable", () => {
    expect(COHORT_EDITABLE_FIELDS).toEqual(expect.arrayContaining(["memberships", "defaultRate", "participantBillingModel", "participantRate"]));
  });
  it("plans additions, removals, and retained memberships without recreating a cohort", () => {
    expect(planMembershipChanges(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], retained: ["b"], removed: ["a"] });
  });
  it("normalizes user-defined tags during both create and edit", () => expect(normalizeTags(" GoGetter, speaking, GoGetter ")).toEqual(["GoGetter", "speaking"]));
});
