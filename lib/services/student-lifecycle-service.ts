import type { Prisma, PrismaClient } from "@prisma/client";

type StudentArchiveStore = {
  student: {
    update(args: Prisma.StudentUpdateArgs): Promise<unknown>;
  };
};

export async function archiveStudentRecord(store: StudentArchiveStore, studentId: string, archivedAt = new Date()) {
  if (!studentId.trim()) throw new Error("Student id is required");
  await store.student.update({
    where: { id: studentId },
    data: { archivedAt },
  });
  return { studentId, archivedAt };
}

export async function permanentlyDeleteStudentRecord(store: PrismaClient, studentId: string) {
  if (!studentId.trim()) throw new Error("Student id is required");
  await store.$transaction(async (tx) => {
    await tx.student.findUniqueOrThrow({ where: { id: studentId }, select: { id: true } });
    const [lessons, payments] = await Promise.all([
      tx.lesson.findMany({ where: { studentId }, select: { id: true } }),
      tx.payment.findMany({ where: { studentId }, select: { id: true } }),
    ]);
    const lessonIds = lessons.map(({ id }) => id);
    const paymentIds = payments.map(({ id }) => id);

    if (paymentIds.length) {
      await tx.credit.updateMany({ where: { destinationPaymentId: { in: paymentIds }, studentId: { not: studentId } }, data: { destinationPaymentId: null } });
      await tx.payment.updateMany({ where: { correctsPaymentId: { in: paymentIds } }, data: { correctsPaymentId: null } });
      await tx.attachment.deleteMany({ where: { paymentId: { in: paymentIds } } });
    }
    if (lessonIds.length) {
      await tx.lesson.updateMany({ where: { originalLessonId: { in: lessonIds } }, data: { originalLessonId: null } });
      await tx.credit.updateMany({ where: { sourceLessonId: { in: lessonIds }, studentId: { not: studentId } }, data: { sourceLessonId: null } });
    }

    await tx.credit.deleteMany({ where: { studentId } });
    await tx.attendance.deleteMany({ where: { OR: [{ studentId }, ...(lessonIds.length ? [{ lessonId: { in: lessonIds } }] : [])] } });
    await tx.learningRecord.deleteMany({ where: { studentId } });
    await tx.testResult.deleteMany({ where: { studentId } });
    await tx.payment.deleteMany({ where: { studentId } });
    await tx.lesson.deleteMany({ where: { studentId } });
    await tx.recurringSchedule.deleteMany({ where: { studentId } });
    await tx.billingProfile.deleteMany({ where: { studentId } });
    await tx.cohortMembership.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { id: studentId } });
  });
  return { studentId };
}
