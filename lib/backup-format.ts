export const TUTORFLOW_BACKUP_FORMAT = "tutorflow-backup" as const;
export const TUTORFLOW_BACKUP_VERSION = 1 as const;

export const BACKUP_MODEL_NAMES = [
  "TeacherSettings", "Student", "Cohort", "LessonPlanningMonth", "CohortMembership",
  "BillingProfile", "RecurringSchedule", "ScheduleSlot", "ScheduleException", "Lesson",
  "LessonStage", "Attendance", "Payment", "Credit", "LearningRecord", "TestResult",
  "Attachment", "Tag", "StudentTag", "CohortTag", "LessonTag",
] as const;

export type BackupModelName = (typeof BACKUP_MODEL_NAMES)[number];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type BackupRow = Record<string, JsonValue>;
export type TutorFlowBackupData = Record<BackupModelName, BackupRow[]>;
export type TutorFlowBackup = {
  format: typeof TUTORFLOW_BACKUP_FORMAT;
  version: typeof TUTORFLOW_BACKUP_VERSION;
  createdAt: string;
  data: TutorFlowBackupData;
};

export const BACKUP_SCALAR_FIELDS: Record<BackupModelName, readonly string[]> = {
  TeacherSettings: ["id", "displayName", "avatarUrl", "timezone", "defaultLessonDuration", "currency", "createdAt", "updatedAt"],
  Student: ["id", "name", "imageUrl", "color", "status", "yearOrLevel", "notesPrivate", "archivedAt", "createdAt", "updatedAt"],
  Cohort: ["id", "name", "kind", "imageUrl", "color", "activeFrom", "activeTo", "defaultRateMinor", "createdAt", "updatedAt"],
  LessonPlanningMonth: ["id", "studentId", "cohortId", "month", "createdAt"],
  CohortMembership: ["id", "studentId", "cohortId", "activeFrom", "activeTo", "status", "trialLessonDate", "regularFrom", "colorOverride", "createdAt", "updatedAt"],
  BillingProfile: ["id", "studentId", "cohortId", "membershipId", "model", "amountMinor", "effectiveFrom", "effectiveTo", "createdAt", "updatedAt"],
  RecurringSchedule: ["id", "studentId", "cohortId", "effectiveFrom", "effectiveTo", "status", "timezone", "revision", "createdAt", "updatedAt"],
  ScheduleSlot: ["id", "scheduleId", "weekday", "startMinute", "durationMinutes"],
  ScheduleException: ["id", "scheduleId", "occurrenceDate", "kind", "replacementDate", "replacementStartMinute", "replacementDurationMinutes", "note"],
  Lesson: ["id", "studentId", "cohortId", "scheduledDate", "startMinute", "durationMinutes", "title", "goal", "homeworkText", "notes", "status", "completedAt", "recurringScheduleId", "scheduleRevision", "generationKey", "manuallyEdited", "kanbanVisible", "kanbanMaterializedAt", "kanbanOrder", "originalLessonId", "colorOverride", "createdAt", "updatedAt"],
  LessonStage: ["id", "lessonId", "text", "completed", "sortOrder"],
  Attendance: ["id", "lessonId", "studentId", "status", "note", "manuallyEdited", "createdAt", "updatedAt"],
  Payment: ["id", "studentId", "cohortId", "billingProfileId", "periodLabel", "periodStart", "periodEnd", "paymentDate", "suggestedAmountMinor", "actualAmountMinor", "calculationNote", "manuallyOverridden", "billingModel", "status", "comment", "receiptUrl", "correctsPaymentId", "createdAt"],
  Credit: ["id", "studentId", "sourceLessonId", "sourcePaymentId", "sourcePeriodLabel", "amountMinor", "lessonEquivalent", "destinationPeriodLabel", "destinationPaymentId", "status", "confirmedAt", "note", "createdAt"],
  LearningRecord: ["id", "studentId", "kind", "entryDate", "title", "content", "note", "parentFacing", "sourceLessonId", "cohortId", "createdAt", "updatedAt"],
  TestResult: ["id", "studentId", "title", "testDate", "score", "maxScore", "percentage", "comment", "sourceLessonId", "cohortId", "createdAt", "updatedAt"],
  Attachment: ["id", "fileName", "mediaType", "externalUrl", "sizeBytes", "lessonId", "learningRecordId", "testResultId", "paymentId", "createdAt"],
  Tag: ["id", "name"],
  StudentTag: ["studentId", "tagId"],
  CohortTag: ["cohortId", "tagId"],
  LessonTag: ["lessonId", "tagId"],
};

const ID_FIELDS: Record<BackupModelName, readonly string[]> = Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, ["id"]])) as unknown as Record<BackupModelName, readonly string[]>;
ID_FIELDS.StudentTag = ["studentId", "tagId"];
ID_FIELDS.CohortTag = ["cohortId", "tagId"];
ID_FIELDS.LessonTag = ["lessonId", "tagId"];

const FOREIGN_KEYS: Partial<Record<BackupModelName, Record<string, BackupModelName>>> = {
  LessonPlanningMonth: { studentId: "Student", cohortId: "Cohort" },
  CohortMembership: { studentId: "Student", cohortId: "Cohort" },
  BillingProfile: { studentId: "Student", cohortId: "Cohort", membershipId: "CohortMembership" },
  RecurringSchedule: { studentId: "Student", cohortId: "Cohort" },
  ScheduleSlot: { scheduleId: "RecurringSchedule" },
  ScheduleException: { scheduleId: "RecurringSchedule" },
  Lesson: { studentId: "Student", cohortId: "Cohort", recurringScheduleId: "RecurringSchedule", originalLessonId: "Lesson" },
  LessonStage: { lessonId: "Lesson" },
  Attendance: { lessonId: "Lesson", studentId: "Student" },
  Payment: { studentId: "Student", cohortId: "Cohort", billingProfileId: "BillingProfile", correctsPaymentId: "Payment" },
  Credit: { studentId: "Student", sourceLessonId: "Lesson", sourcePaymentId: "Payment", destinationPaymentId: "Payment" },
  LearningRecord: { studentId: "Student", sourceLessonId: "Lesson", cohortId: "Cohort" },
  TestResult: { studentId: "Student", sourceLessonId: "Lesson", cohortId: "Cohort" },
  Attachment: { lessonId: "Lesson", learningRecordId: "LearningRecord", testResultId: "TestResult", paymentId: "Payment" },
  StudentTag: { studentId: "Student", tagId: "Tag" },
  CohortTag: { cohortId: "Cohort", tagId: "Tag" },
  LessonTag: { lessonId: "Lesson", tagId: "Tag" },
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validIsoDate = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value));

export type BackupValidationResult = { ok: true; backup: TutorFlowBackup } | { ok: false; error: string };

export function validateTutorFlowBackup(input: unknown): BackupValidationResult {
  if (!isObject(input)) return { ok: false, error: "Файл не содержит резервную копию TutorFlow." };
  if (Object.keys(input).some((key) => !["format", "version", "createdAt", "data"].includes(key))) return { ok: false, error: "Файл содержит неизвестные поля и не соответствует backup v1." };
  if (input.format !== TUTORFLOW_BACKUP_FORMAT) return { ok: false, error: "Неверный формат резервной копии." };
  if (input.version !== TUTORFLOW_BACKUP_VERSION) return { ok: false, error: "Эта версия резервной копии пока не поддерживается." };
  if (!validIsoDate(input.createdAt)) return { ok: false, error: "В резервной копии указана некорректная дата создания." };
  if (!isObject(input.data)) return { ok: false, error: "В резервной копии отсутствует раздел data." };

  const data = input.data as Record<string, unknown>;
  if (Object.keys(data).some((key) => !BACKUP_MODEL_NAMES.includes(key as BackupModelName))) return { ok: false, error: "Резервная копия содержит неизвестный раздел данных." };
  for (const name of BACKUP_MODEL_NAMES) {
    if (!Array.isArray(data[name])) return { ok: false, error: `В резервной копии отсутствует раздел ${name}.` };
    const allowed = new Set(BACKUP_SCALAR_FIELDS[name]);
    const identities = new Set<string>();
    for (const [index, candidate] of data[name].entries()) {
      if (!isObject(candidate)) return { ok: false, error: `${name}[${index}] имеет неверную структуру.` };
      const keys = Object.keys(candidate);
      if (keys.some((key) => !allowed.has(key)) || BACKUP_SCALAR_FIELDS[name].some((key) => !(key in candidate))) return { ok: false, error: `${name}[${index}] не соответствует формату backup v1.` };
      for (const key of ID_FIELDS[name]) if (typeof candidate[key] !== "string" || !candidate[key]) return { ok: false, error: `${name}[${index}].${key} должен содержать ID.` };
      const identity = ID_FIELDS[name].map((key) => candidate[key]).join("\u0000");
      if (identities.has(identity)) return { ok: false, error: `${name} содержит повторяющийся идентификатор.` };
      identities.add(identity);
    }
  }

  const ids = Object.fromEntries(BACKUP_MODEL_NAMES.map((name) => [name, new Set((data[name] as BackupRow[]).map((row) => row.id).filter((id): id is string => typeof id === "string"))])) as Record<BackupModelName, Set<string>>;
  for (const name of BACKUP_MODEL_NAMES) {
    for (const [index, row] of (data[name] as BackupRow[]).entries()) {
      for (const [field, target] of Object.entries(FOREIGN_KEYS[name] ?? {})) {
        const value = row[field];
        if (value !== null && (typeof value !== "string" || !ids[target].has(value))) return { ok: false, error: `${name}[${index}].${field} ссылается на отсутствующую запись.` };
      }
    }
  }

  return { ok: true, backup: input as TutorFlowBackup };
}

export function parseTutorFlowBackupJson(text: string): BackupValidationResult {
  try { return validateTutorFlowBackup(JSON.parse(text)); }
  catch { return { ok: false, error: "Не удалось прочитать JSON-файл." }; }
}

export function backupPreview(backup: TutorFlowBackup) {
  return {
    createdAt: backup.createdAt,
    version: backup.version,
    students: backup.data.Student.length,
    cohorts: backup.data.Cohort.length,
    memberships: backup.data.CohortMembership.length,
    lessons: backup.data.Lesson.length,
    schedules: backup.data.RecurringSchedule.length,
    payments: backup.data.Payment.length,
    learningRecords: backup.data.LearningRecord.length + backup.data.TestResult.length,
  };
}
