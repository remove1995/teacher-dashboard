ALTER TABLE "Student" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Student_archivedAt_idx" ON "Student"("archivedAt");
