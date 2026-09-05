import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";
import { TUTORFLOW_BACKUP_FORMAT, TUTORFLOW_BACKUP_VERSION, type JsonValue, type TutorFlowBackup, type TutorFlowBackupData } from "../backup-format";
export { BACKUP_MODEL_NAMES, TUTORFLOW_BACKUP_FORMAT, TUTORFLOW_BACKUP_VERSION } from "../backup-format";
export type { JsonValue, TutorFlowBackup, TutorFlowBackupData } from "../backup-format";

type BackupDatabase = Prisma.TransactionClient;

export function serializeBackupValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (Array.isArray(value)) return value.map(serializeBackupValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeBackupValue(item)]));
  throw new TypeError(`Unsupported backup value type: ${typeof value}`);
}

async function readBackupData(client: BackupDatabase): Promise<TutorFlowBackupData> {
  const [
    TeacherSettings, Student, Cohort, LessonPlanningMonth, CohortMembership,
    BillingProfile, RecurringSchedule, ScheduleSlot, ScheduleException, Lesson,
    LessonStage, Attendance, Payment, Credit, LearningRecord, TestResult,
    Attachment, Tag, StudentTag, CohortTag, LessonTag,
  ] = await Promise.all([
    client.teacherSettings.findMany(),
    client.student.findMany(),
    client.cohort.findMany(),
    client.lessonPlanningMonth.findMany(),
    client.cohortMembership.findMany(),
    client.billingProfile.findMany(),
    client.recurringSchedule.findMany(),
    client.scheduleSlot.findMany(),
    client.scheduleException.findMany(),
    client.lesson.findMany(),
    client.lessonStage.findMany(),
    client.attendance.findMany(),
    client.payment.findMany(),
    client.credit.findMany(),
    client.learningRecord.findMany(),
    client.testResult.findMany(),
    client.attachment.findMany(),
    client.tag.findMany(),
    client.studentTag.findMany(),
    client.cohortTag.findMany(),
    client.lessonTag.findMany(),
  ]);

  return serializeBackupValue({
    TeacherSettings, Student, Cohort, LessonPlanningMonth, CohortMembership,
    BillingProfile, RecurringSchedule, ScheduleSlot, ScheduleException, Lesson,
    LessonStage, Attendance, Payment, Credit, LearningRecord, TestResult,
    Attachment, Tag, StudentTag, CohortTag, LessonTag,
  }) as TutorFlowBackupData;
}

export function buildTutorFlowBackup(data: TutorFlowBackupData, createdAt = new Date()): TutorFlowBackup {
  return {
    format: TUTORFLOW_BACKUP_FORMAT,
    version: TUTORFLOW_BACKUP_VERSION,
    createdAt: createdAt.toISOString(),
    data,
  };
}

export async function createTutorFlowBackup(client: PrismaClient = prisma, createdAt = new Date()) {
  const data = await client.$transaction((transaction) => readBackupData(transaction), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return buildTutorFlowBackup(data, createdAt);
}

export function backupFileName(createdAt: Date) {
  const stamp = createdAt.toISOString().replace(/T/, "-").replace(/:/g, "").slice(0, 15);
  return `tutorflow-backup-${stamp}.json`;
}
