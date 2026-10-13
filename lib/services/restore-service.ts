import { Prisma, type PrismaClient } from "@prisma/client";
import type { BackupRow, TutorFlowBackup } from "../backup-format";
import { validateTutorFlowBackup } from "../backup-format";

const input = <T>(rows: BackupRow[]) => rows as unknown as T[];
const without = (row: BackupRow, field: string) => ({ ...row, [field]: null });

/*
 * SINGLE-USER ADMIN RESTORE ONLY
 *
 * This restore flow replaces the entire application database.
 * It must not be reused as-is in a future multi-user / multi-tenant TutorFlow.
 * Future SaaS restore must operate only at teacher/account/tenant scope.
 */
export async function restoreSingleUserDatabase(client: PrismaClient, candidate: unknown) {
  const validation = validateTutorFlowBackup(candidate);
  if (!validation.ok) throw new Error(validation.error);
  const backup = validation.backup;

  await client.$transaction(async (tx) => {
    await tx.extraIncome.deleteMany();
    await tx.incomeTag.deleteMany();
    await tx.attachment.deleteMany();
    await tx.studentTag.deleteMany();
    await tx.cohortTag.deleteMany();
    await tx.lessonTag.deleteMany();
    await tx.lessonStage.deleteMany();
    await tx.credit.deleteMany();
    await tx.attendance.deleteMany();
    await tx.learningRecord.deleteMany();
    await tx.testResult.deleteMany();
    await tx.payment.updateMany({ data: { correctsPaymentId: null } });
    await tx.payment.deleteMany();
    await tx.lesson.updateMany({ data: { originalLessonId: null } });
    await tx.lesson.deleteMany();
    await tx.scheduleException.deleteMany();
    await tx.scheduleSlot.deleteMany();
    await tx.lessonPlanningMonth.deleteMany();
    await tx.billingProfile.deleteMany();
    await tx.recurringSchedule.deleteMany();
    await tx.cohortMembership.deleteMany();
    await tx.tag.deleteMany();
    await tx.cohort.deleteMany();
    await tx.student.deleteMany();
    await tx.teacherSettings.deleteMany();

    const data = backup.data;
    if (data.IncomeTag.length) await tx.incomeTag.createMany({ data: input<Prisma.IncomeTagCreateManyInput>(data.IncomeTag) });
    if (data.ExtraIncome.length) await tx.extraIncome.createMany({ data: input<Prisma.ExtraIncomeCreateManyInput>(data.ExtraIncome) });
    if (data.TeacherSettings.length) await tx.teacherSettings.createMany({ data: input<Prisma.TeacherSettingsCreateManyInput>(data.TeacherSettings) });
    if (data.Student.length) await tx.student.createMany({ data: input<Prisma.StudentCreateManyInput>(data.Student) });
    if (data.Cohort.length) await tx.cohort.createMany({ data: input<Prisma.CohortCreateManyInput>(data.Cohort) });
    if (data.Tag.length) await tx.tag.createMany({ data: input<Prisma.TagCreateManyInput>(data.Tag) });
    if (data.LessonPlanningMonth.length) await tx.lessonPlanningMonth.createMany({ data: input<Prisma.LessonPlanningMonthCreateManyInput>(data.LessonPlanningMonth) });
    if (data.CohortMembership.length) await tx.cohortMembership.createMany({ data: input<Prisma.CohortMembershipCreateManyInput>(data.CohortMembership) });
    if (data.BillingProfile.length) await tx.billingProfile.createMany({ data: input<Prisma.BillingProfileCreateManyInput>(data.BillingProfile) });
    if (data.RecurringSchedule.length) await tx.recurringSchedule.createMany({ data: input<Prisma.RecurringScheduleCreateManyInput>(data.RecurringSchedule) });
    if (data.ScheduleSlot.length) await tx.scheduleSlot.createMany({ data: input<Prisma.ScheduleSlotCreateManyInput>(data.ScheduleSlot) });
    if (data.ScheduleException.length) await tx.scheduleException.createMany({ data: input<Prisma.ScheduleExceptionCreateManyInput>(data.ScheduleException) });

    const lessonLinks = data.Lesson.filter((row) => row.originalLessonId !== null).map((row) => ({ id: String(row.id), originalLessonId: String(row.originalLessonId) }));
    if (data.Lesson.length) await tx.lesson.createMany({ data: input<Prisma.LessonCreateManyInput>(data.Lesson.map((row) => without(row, "originalLessonId"))) });
    for (const link of lessonLinks) await tx.lesson.update({ where: { id: link.id }, data: { originalLessonId: link.originalLessonId } });

    if (data.LessonStage.length) await tx.lessonStage.createMany({ data: input<Prisma.LessonStageCreateManyInput>(data.LessonStage) });
    if (data.Attendance.length) await tx.attendance.createMany({ data: input<Prisma.AttendanceCreateManyInput>(data.Attendance) });

    const paymentLinks = data.Payment.filter((row) => row.correctsPaymentId !== null).map((row) => ({ id: String(row.id), correctsPaymentId: String(row.correctsPaymentId) }));
    if (data.Payment.length) await tx.payment.createMany({ data: input<Prisma.PaymentCreateManyInput>(data.Payment.map((row) => without(row, "correctsPaymentId"))) });
    for (const link of paymentLinks) await tx.payment.update({ where: { id: link.id }, data: { correctsPaymentId: link.correctsPaymentId } });

    if (data.Credit.length) await tx.credit.createMany({ data: input<Prisma.CreditCreateManyInput>(data.Credit) });
    if (data.LearningRecord.length) await tx.learningRecord.createMany({ data: input<Prisma.LearningRecordCreateManyInput>(data.LearningRecord) });
    if (data.TestResult.length) await tx.testResult.createMany({ data: input<Prisma.TestResultCreateManyInput>(data.TestResult) });
    if (data.Attachment.length) await tx.attachment.createMany({ data: input<Prisma.AttachmentCreateManyInput>(data.Attachment) });
    if (data.StudentTag.length) await tx.studentTag.createMany({ data: input<Prisma.StudentTagCreateManyInput>(data.StudentTag) });
    if (data.CohortTag.length) await tx.cohortTag.createMany({ data: input<Prisma.CohortTagCreateManyInput>(data.CohortTag) });
    if (data.LessonTag.length) await tx.lessonTag.createMany({ data: input<Prisma.LessonTagCreateManyInput>(data.LessonTag) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 60_000 });

  return backup;
}

export function restoreCounts(backup: TutorFlowBackup) {
  return Object.fromEntries(Object.entries(backup.data).map(([name, rows]) => [name, rows.length]));
}
