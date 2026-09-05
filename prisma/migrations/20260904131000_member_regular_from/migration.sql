ALTER TABLE "CohortMembership" ADD COLUMN "regularFrom" DATE;

UPDATE "CohortMembership"
SET "regularFrom" = "activeFrom"
WHERE "status" = 'REGULAR';
