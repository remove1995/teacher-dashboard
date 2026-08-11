ALTER TABLE "Lesson"
ADD COLUMN "kanbanVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "kanbanMaterializedAt" TIMESTAMP(3),
ADD COLUMN "kanbanOrder" INTEGER;

UPDATE "Lesson" AS lesson
SET
  "kanbanVisible" = true,
  "kanbanMaterializedAt" = COALESCE(lesson."updatedAt", lesson."createdAt")
WHERE
  lesson."manuallyEdited" = true
  OR lesson."status" <> 'PLANNED'
  OR lesson."goal" IS NOT NULL
  OR lesson."homeworkText" IS NOT NULL
  OR lesson."notes" IS NOT NULL
  OR EXISTS (SELECT 1 FROM "LessonStage" stage WHERE stage."lessonId" = lesson."id")
  OR EXISTS (SELECT 1 FROM "LessonTag" lesson_tag WHERE lesson_tag."lessonId" = lesson."id");

CREATE INDEX "Lesson_studentId_kanbanVisible_scheduledDate_idx"
ON "Lesson"("studentId", "kanbanVisible", "scheduledDate");

CREATE INDEX "Lesson_cohortId_kanbanVisible_scheduledDate_idx"
ON "Lesson"("cohortId", "kanbanVisible", "scheduledDate");
