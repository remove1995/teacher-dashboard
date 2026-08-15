import { describe, expect, it } from "vitest";
import { financeContextsForStudent, lessonBelongsToStudent } from "./student-profile";

describe("student profile integrations", () => {
  const membership = { cohortId: "group", activeFrom: new Date("2026-01-01"), activeTo: new Date("2026-12-31") };
  it("shows an existing individual lesson in History", () => expect(lessonBelongsToStudent({ studentId: "student", cohortId: null, scheduledDate: new Date("2026-08-01") }, "student", [])).toBe(true));
  it("shows pair/group lessons while the student participated", () => expect(lessonBelongsToStudent({ studentId: null, cohortId: "group", scheduledDate: new Date("2026-08-01") }, "student", [membership])).toBe(true));
  it("does not show cohort lessons outside the membership window", () => expect(lessonBelongsToStudent({ studentId: null, cohortId: "group", scheduledDate: new Date("2027-01-01") }, "student", [membership])).toBe(false));
  it("finds the student's existing finance records", () => expect(financeContextsForStudent([{ participants: [{ studentId: "student" }, { studentId: "other" }] }], "student")).toHaveLength(1));
  it("keeps multiple billing contexts separate", () => expect(financeContextsForStudent([{ participants: [{ studentId: "student" }] }, { participants: [{ studentId: "student" }] }], "student")).toHaveLength(2));
  it("the visible navigation excludes the redundant Notes tab", () => expect(["Обзор", "История", "Финансы", "Обучение"]).not.toContain("Заметки"));
});
