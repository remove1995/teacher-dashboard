import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { archiveStudentRecord, permanentlyDeleteStudentRecord } from "./student-lifecycle-service";

const prisma = new PrismaClient();
const day = new Date("2026-08-28T00:00:00.000Z");

afterAll(() => prisma.$disconnect());

describe("student lifecycle persistence", () => {
  it("writes archivedAt while preserving the student and related lesson", async () => {
    const student = await prisma.student.create({ data: { name: `Archive test ${crypto.randomUUID()}`, color: "#9a8f7a" } });
    const lesson = await prisma.lesson.create({ data: { studentId: student.id, scheduledDate: day, startMinute: 600, durationMinutes: 60, title: "Archive persistence" } });
    try {
      const archivedAt = new Date("2026-08-28T12:00:00.000Z");
      await archiveStudentRecord(prisma, student.id, archivedAt);
      const persisted = await prisma.student.findUnique({ where: { id: student.id }, include: { individualLessons: true } });
      expect(persisted?.archivedAt).toEqual(archivedAt);
      expect(persisted?.individualLessons.map(({ id }) => id)).toContain(lesson.id);
    } finally {
      await permanentlyDeleteStudentRecord(prisma, student.id);
    }
  });

  it("permanently deletes the selected student relations without touching another student", async () => {
    const survivor = await prisma.student.create({ data: { name: `Survivor ${crypto.randomUUID()}`, color: "#8d9b81" } });
    const target = await prisma.student.create({ data: { name: `Delete test ${crypto.randomUUID()}`, color: "#b58f83" } });
    try {
      const billing = await prisma.billingProfile.create({ data: { studentId: target.id, model: "PAY_PER_LESSON", amountMinor: 150000, effectiveFrom: day } });
      const lesson = await prisma.lesson.create({ data: { studentId: target.id, scheduledDate: day, startMinute: 720, durationMinutes: 60, title: "Delete persistence", kanbanVisible: true } });
      await prisma.attendance.create({ data: { lessonId: lesson.id, studentId: target.id, status: "PRESENT" } });
      const payment = await prisma.payment.create({ data: { studentId: target.id, billingProfileId: billing.id, periodLabel: "August 2026", periodStart: day, periodEnd: day, suggestedAmountMinor: 150000, calculationNote: "Test", billingModel: "PAY_PER_LESSON", status: "EXPECTED" } });
      await prisma.credit.create({ data: { studentId: target.id, sourceLessonId: lesson.id, destinationPaymentId: payment.id, amountMinor: 150000, confirmedAt: day } });
      await prisma.learningRecord.create({ data: { studentId: target.id, kind: "NOTE", entryDate: day, title: "Test note", sourceLessonId: lesson.id } });
      await prisma.testResult.create({ data: { studentId: target.id, title: "Test result", testDate: day, sourceLessonId: lesson.id } });

      await permanentlyDeleteStudentRecord(prisma, target.id);

      expect(await prisma.student.findUnique({ where: { id: target.id } })).toBeNull();
      expect(await prisma.student.findUnique({ where: { id: survivor.id } })).not.toBeNull();
      expect(await prisma.lesson.count({ where: { studentId: target.id } })).toBe(0);
      expect(await prisma.payment.count({ where: { studentId: target.id } })).toBe(0);
    } finally {
      if (await prisma.student.findUnique({ where: { id: target.id }, select: { id: true } })) await permanentlyDeleteStudentRecord(prisma, target.id);
      await permanentlyDeleteStudentRecord(prisma, survivor.id);
    }
  });
});
