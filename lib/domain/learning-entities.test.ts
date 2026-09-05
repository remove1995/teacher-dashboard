import { describe, expect, it } from "vitest";
import { buildLearningEntities } from "./learning-entities";

const student = (id: string, individual: "none" | "schedule" | "billing") => ({
  id,
  name: id,
  color: "#888888",
  individualSchedules: individual === "schedule" ? [{}] : [],
  billingProfiles: individual === "billing" ? [{}] : [],
});
const pair = { id: "pair", name: "Pair", color: "#999999", kind: "PAIR" as const };
const group = { id: "group", name: "Group", color: "#777777", kind: "GROUP" as const };

describe("active learning entities", () => {
  it("shows an individual-only student", () => expect(buildLearningEntities([student("individual", "billing")], [])).toContainEqual(expect.objectContaining({ value: "student:individual" })));
  it("shows a pair", () => expect(buildLearningEntities([], [pair])).toContainEqual(expect.objectContaining({ value: "cohort:pair", kind: "Пара" })));
  it("shows a group", () => expect(buildLearningEntities([], [group])).toContainEqual(expect.objectContaining({ value: "cohort:group", kind: "Группа" })));
  it("hides a pair-only member as a standalone student", () => expect(buildLearningEntities([student("pair-member", "none")], [pair]).map(({ value }) => value)).toEqual(["cohort:pair"]));
  it("hides a group-only member as a standalone student", () => expect(buildLearningEntities([student("group-member", "none")], [group]).map(({ value }) => value)).toEqual(["cohort:group"]));
  it("keeps a student with both an individual format and cohort membership", () => expect(buildLearningEntities([student("mixed", "schedule")], [group]).map(({ value }) => value)).toEqual(["student:mixed", "cohort:group"]));
  it("does not return duplicate learning entities", () => expect(buildLearningEntities([student("same", "schedule"), student("same", "billing")], [pair, pair]).map(({ value }) => value)).toEqual(["student:same", "cohort:pair"]));
});
