-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE "CohortKind" AS ENUM ('PAIR', 'GROUP');
CREATE TYPE "BillingModel" AS ENUM ('MONTHLY_PREPAID', 'WEEKLY_PREPAID', 'PAY_PER_LESSON', 'GROUP_SUBSCRIPTION');
CREATE TYPE "RecurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "ScheduleExceptionKind" AS ENUM ('CANCEL', 'OCCURRENCE_OVERRIDE', 'BREAK');
CREATE TYPE "LessonStatus" AS ENUM ('PLANNED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'RESCHEDULED', 'CANCELLED', 'PLANNED');
CREATE TYPE "PaymentStatus" AS ENUM ('EXPECTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE');
CREATE TYPE "CreditStatus" AS ENUM ('AVAILABLE', 'APPLIED', 'VOID');
CREATE TYPE "LearningRecordKind" AS ENUM ('VOCABULARY', 'GRAMMAR_FUNCTION', 'NOTE');

-- CreateTable
CREATE TABLE "Student" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "imageUrl" TEXT, "color" TEXT NOT NULL,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE', "yearOrLevel" TEXT, "notesPrivate" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Cohort" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" "CohortKind" NOT NULL, "color" TEXT NOT NULL,
  "activeFrom" DATE NOT NULL, "activeTo" DATE, "defaultRateMinor" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CohortMembership" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "cohortId" TEXT NOT NULL, "activeFrom" DATE NOT NULL,
  "activeTo" DATE, "colorOverride" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CohortMembership_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BillingProfile" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "cohortId" TEXT, "model" "BillingModel" NOT NULL,
  "amountMinor" INTEGER NOT NULL, "effectiveFrom" DATE NOT NULL, "effectiveTo" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecurringSchedule" (
  "id" TEXT NOT NULL, "studentId" TEXT, "cohortId" TEXT, "effectiveFrom" DATE NOT NULL, "effectiveTo" DATE,
  "status" "RecurrenceStatus" NOT NULL DEFAULT 'ACTIVE', "timezone" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringSchedule_exactly_one_target" CHECK (("studentId" IS NOT NULL)::int + ("cohortId" IS NOT NULL)::int = 1)
);
CREATE TABLE "ScheduleSlot" (
  "id" TEXT NOT NULL, "scheduleId" TEXT NOT NULL, "weekday" INTEGER NOT NULL, "startMinute" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL, CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleSlot_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "ScheduleSlot_start_range" CHECK ("startMinute" BETWEEN 0 AND 1439),
  CONSTRAINT "ScheduleSlot_duration_positive" CHECK ("durationMinutes" > 0)
);
CREATE TABLE "ScheduleException" (
  "id" TEXT NOT NULL, "scheduleId" TEXT NOT NULL, "occurrenceDate" DATE NOT NULL,
  "kind" "ScheduleExceptionKind" NOT NULL, "replacementDate" DATE, "replacementStartMinute" INTEGER,
  "replacementDurationMinutes" INTEGER, "note" TEXT, CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL, "studentId" TEXT, "cohortId" TEXT, "scheduledDate" DATE NOT NULL,
  "startMinute" INTEGER NOT NULL, "durationMinutes" INTEGER NOT NULL, "title" TEXT NOT NULL, "goal" TEXT,
  "homeworkText" TEXT, "notes" TEXT, "status" "LessonStatus" NOT NULL DEFAULT 'PLANNED', "completedAt" TIMESTAMP(3),
  "recurringScheduleId" TEXT, "scheduleRevision" INTEGER, "generationKey" TEXT, "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
  "originalLessonId" TEXT, "colorOverride" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lesson_exactly_one_target" CHECK (("studentId" IS NOT NULL)::int + ("cohortId" IS NOT NULL)::int = 1),
  CONSTRAINT "Lesson_start_range" CHECK ("startMinute" BETWEEN 0 AND 1439),
  CONSTRAINT "Lesson_duration_positive" CHECK ("durationMinutes" > 0)
);
CREATE TABLE "LessonStage" (
  "id" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "text" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL, CONSTRAINT "LessonStage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PLANNED', "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "cohortId" TEXT, "billingProfileId" TEXT,
  "periodLabel" TEXT NOT NULL, "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL, "paymentDate" DATE,
  "suggestedAmountMinor" INTEGER NOT NULL, "actualAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "calculationNote" TEXT NOT NULL, "manuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
  "billingModel" "BillingModel" NOT NULL, "status" "PaymentStatus" NOT NULL, "comment" TEXT, "receiptUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_period_order" CHECK ("periodEnd" >= "periodStart"),
  CONSTRAINT "Payment_amounts_nonnegative" CHECK ("suggestedAmountMinor" >= 0 AND "actualAmountMinor" >= 0)
);
CREATE TABLE "Credit" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "sourceLessonId" TEXT, "sourcePeriodLabel" TEXT,
  "amountMinor" INTEGER NOT NULL, "lessonEquivalent" DECIMAL(6,2), "destinationPeriodLabel" TEXT,
  "destinationPaymentId" TEXT, "status" "CreditStatus" NOT NULL DEFAULT 'AVAILABLE', "confirmedAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Credit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Credit_amount_nonnegative" CHECK ("amountMinor" >= 0)
);
CREATE TABLE "LearningRecord" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "kind" "LearningRecordKind" NOT NULL, "entryDate" DATE NOT NULL,
  "title" TEXT NOT NULL, "content" TEXT, "parentFacing" BOOLEAN NOT NULL DEFAULT false,
  "sourceLessonId" TEXT, "cohortId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LearningRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TestResult" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "title" TEXT NOT NULL, "testDate" DATE NOT NULL,
  "score" DECIMAL(8,2), "maxScore" DECIMAL(8,2), "percentage" DECIMAL(5,2), "comment" TEXT,
  "sourceLessonId" TEXT, "cohortId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mediaType" TEXT, "externalUrl" TEXT, "sizeBytes" INTEGER,
  "lessonId" TEXT, "learningRecordId" TEXT, "testResultId" TEXT, "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attachment_exactly_one_owner" CHECK (("lessonId" IS NOT NULL)::int + ("learningRecordId" IS NOT NULL)::int + ("testResultId" IS NOT NULL)::int + ("paymentId" IS NOT NULL)::int = 1)
);
CREATE TABLE "Tag" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"));
CREATE TABLE "StudentTag" ("studentId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "StudentTag_pkey" PRIMARY KEY ("studentId", "tagId"));
CREATE TABLE "CohortTag" ("cohortId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "CohortTag_pkey" PRIMARY KEY ("cohortId", "tagId"));
CREATE TABLE "LessonTag" ("lessonId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "LessonTag_pkey" PRIMARY KEY ("lessonId", "tagId"));

-- Indexes
CREATE UNIQUE INDEX "CohortMembership_studentId_cohortId_activeFrom_key" ON "CohortMembership"("studentId", "cohortId", "activeFrom");
CREATE INDEX "CohortMembership_cohortId_activeFrom_activeTo_idx" ON "CohortMembership"("cohortId", "activeFrom", "activeTo");
CREATE INDEX "CohortMembership_studentId_activeFrom_activeTo_idx" ON "CohortMembership"("studentId", "activeFrom", "activeTo");
CREATE INDEX "BillingProfile_studentId_cohortId_effectiveFrom_effectiveTo_idx" ON "BillingProfile"("studentId", "cohortId", "effectiveFrom", "effectiveTo");
CREATE INDEX "RecurringSchedule_studentId_status_idx" ON "RecurringSchedule"("studentId", "status");
CREATE INDEX "RecurringSchedule_cohortId_status_idx" ON "RecurringSchedule"("cohortId", "status");
CREATE UNIQUE INDEX "ScheduleSlot_scheduleId_weekday_startMinute_key" ON "ScheduleSlot"("scheduleId", "weekday", "startMinute");
CREATE INDEX "ScheduleException_scheduleId_occurrenceDate_idx" ON "ScheduleException"("scheduleId", "occurrenceDate");
CREATE UNIQUE INDEX "Lesson_generationKey_key" ON "Lesson"("generationKey");
CREATE UNIQUE INDEX "Lesson_originalLessonId_key" ON "Lesson"("originalLessonId");
CREATE INDEX "Lesson_scheduledDate_status_idx" ON "Lesson"("scheduledDate", "status");
CREATE INDEX "Lesson_studentId_scheduledDate_idx" ON "Lesson"("studentId", "scheduledDate");
CREATE INDEX "Lesson_cohortId_scheduledDate_idx" ON "Lesson"("cohortId", "scheduledDate");
CREATE INDEX "Lesson_recurringScheduleId_scheduledDate_idx" ON "Lesson"("recurringScheduleId", "scheduledDate");
CREATE UNIQUE INDEX "LessonStage_lessonId_sortOrder_key" ON "LessonStage"("lessonId", "sortOrder");
CREATE UNIQUE INDEX "Attendance_lessonId_studentId_key" ON "Attendance"("lessonId", "studentId");
CREATE INDEX "Attendance_studentId_status_idx" ON "Attendance"("studentId", "status");
CREATE INDEX "Payment_studentId_periodStart_periodEnd_idx" ON "Payment"("studentId", "periodStart", "periodEnd");
CREATE INDEX "Payment_status_paymentDate_idx" ON "Payment"("status", "paymentDate");
CREATE INDEX "Credit_studentId_status_idx" ON "Credit"("studentId", "status");
CREATE INDEX "LearningRecord_studentId_entryDate_kind_idx" ON "LearningRecord"("studentId", "entryDate", "kind");
CREATE INDEX "TestResult_studentId_testDate_idx" ON "TestResult"("studentId", "testDate");
CREATE INDEX "Attachment_lessonId_idx" ON "Attachment"("lessonId");
CREATE INDEX "Attachment_learningRecordId_idx" ON "Attachment"("learningRecordId");
CREATE INDEX "Attachment_testResultId_idx" ON "Attachment"("testResultId");
CREATE INDEX "Attachment_paymentId_idx" ON "Attachment"("paymentId");
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- Foreign keys
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_recurringScheduleId_fkey" FOREIGN KEY ("recurringScheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_originalLessonId_fkey" FOREIGN KEY ("originalLessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonStage" ADD CONSTRAINT "LessonStage_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billingProfileId_fkey" FOREIGN KEY ("billingProfileId") REFERENCES "BillingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_sourceLessonId_fkey" FOREIGN KEY ("sourceLessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_destinationPaymentId_fkey" FOREIGN KEY ("destinationPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningRecord" ADD CONSTRAINT "LearningRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningRecord" ADD CONSTRAINT "LearningRecord_sourceLessonId_fkey" FOREIGN KEY ("sourceLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningRecord" ADD CONSTRAINT "LearningRecord_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_sourceLessonId_fkey" FOREIGN KEY ("sourceLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_learningRecordId_fkey" FOREIGN KEY ("learningRecordId") REFERENCES "LearningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTag" ADD CONSTRAINT "StudentTag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTag" ADD CONSTRAINT "StudentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortTag" ADD CONSTRAINT "CohortTag_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortTag" ADD CONSTRAINT "CohortTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonTag" ADD CONSTRAINT "LessonTag_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonTag" ADD CONSTRAINT "LessonTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
