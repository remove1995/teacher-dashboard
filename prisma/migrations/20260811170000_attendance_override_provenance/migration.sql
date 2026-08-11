ALTER TABLE "Attendance" ADD COLUMN "manuallyEdited" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Attendance" AS attendance
SET "manuallyEdited" = true
FROM "Lesson" AS lesson
WHERE attendance."lessonId" = lesson."id"
  AND lesson."cohortId" IS NOT NULL
  AND attendance."status" <> 'PLANNED';
