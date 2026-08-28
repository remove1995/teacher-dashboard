import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("safe deletion contracts", () => {
  it("keeps archiving separate from the student learning status", () => {
    expect(source("prisma/schema.prisma")).toContain("archivedAt         DateTime?");
    expect(source("app/students/page.tsx")).toContain("where: { archivedAt: null }");
    const controls = source("components/student-lifecycle-actions.tsx");
    expect(controls).toContain("await archiveStudent(studentId)");
    expect(controls).toContain("await deleteStudentForever(studentId)");
    expect(controls).toContain('router.replace("/students")');
  });

  it("names the lesson in its destructive confirmation", () => {
    const controls = source("components/lesson-workspace-controls.tsx");
    expect(controls).toContain("Удалить план «${label}»?");
    expect(controls).toContain("await deleteLesson(lessonId)");
  });

  it("warns that deleting a month deletes its lesson plans", () => {
    const board = source("components/lesson-kanban-board.tsx");
    expect(board).toContain("Вместе с ним будут удалены все планы уроков внутри месяца");
    expect(board).toContain("await deleteLessonMonth(targetType,targetId,column.key)");
    expect(board).toContain("selectMonth(next,true)");
    expect(source("app/lessons/page.tsx")).not.toContain("monthRecords.push");
  });

  it("detaches restricted lesson relations before deleting lessons", () => {
    const actions = source("app/actions/lessons.ts");
    expect(actions).toContain("originalLessonId: { in: lessonIds }");
    expect(actions).toContain("sourceLessonId: { in: lessonIds }");
    expect(actions).toContain("attendance.deleteMany");
  });

  it("requires distinct confirmations for archive and permanent deletion", () => {
    const controls = source("components/student-lifecycle-actions.tsx");
    expect(controls).toContain("`Архивировать ${studentName}?`");
    expect(controls).toContain("`Удалить ${studentName} навсегда?`");
    expect(controls).toContain("Это действие нельзя отменить");
    expect(controls).toContain('className="student-lifecycle-trigger"');
    expect(controls).not.toContain("student-danger-menu");
  });
});
