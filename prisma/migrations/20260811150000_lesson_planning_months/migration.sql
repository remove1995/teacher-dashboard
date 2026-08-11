CREATE TABLE "LessonPlanningMonth" (
  "id" TEXT NOT NULL,
  "studentId" TEXT,
  "cohortId" TEXT,
  "month" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonPlanningMonth_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonPlanningMonth_target_check" CHECK (("studentId" IS NOT NULL) <> ("cohortId" IS NOT NULL))
);

CREATE UNIQUE INDEX "LessonPlanningMonth_studentId_month_key" ON "LessonPlanningMonth"("studentId", "month");
CREATE UNIQUE INDEX "LessonPlanningMonth_cohortId_month_key" ON "LessonPlanningMonth"("cohortId", "month");
CREATE INDEX "LessonPlanningMonth_month_createdAt_idx" ON "LessonPlanningMonth"("month", "createdAt");

ALTER TABLE "LessonPlanningMonth" ADD CONSTRAINT "LessonPlanningMonth_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonPlanningMonth" ADD CONSTRAINT "LessonPlanningMonth_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
