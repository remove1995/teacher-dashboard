import { describe, expect, it, vi } from "vitest";
import { archiveStudentRecord } from "./student-lifecycle-service";

describe("student lifecycle service", () => {
  it("archives the requested student without deleting related data", async () => {
    const update = vi.fn().mockResolvedValue({ id: "student-1" });
    const archivedAt = new Date("2026-08-28T10:00:00.000Z");
    const result = await archiveStudentRecord({ student: { update } }, "student-1", archivedAt);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({ where: { id: "student-1" }, data: { archivedAt } });
    expect(result).toEqual({ studentId: "student-1", archivedAt });
  });

  it("does not issue an update without a student id", async () => {
    const update = vi.fn();
    await expect(archiveStudentRecord({ student: { update } }, " ")).rejects.toThrow("Student id is required");
    expect(update).not.toHaveBeenCalled();
  });
});
