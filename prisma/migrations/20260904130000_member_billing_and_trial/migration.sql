CREATE TYPE "CohortMemberStatus" AS ENUM ('REGULAR', 'TRIAL');

ALTER TABLE "CohortMembership"
ADD COLUMN "status" "CohortMemberStatus" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN "trialLessonDate" DATE;

ALTER TABLE "BillingProfile" ADD COLUMN "membershipId" TEXT;

UPDATE "BillingProfile" AS billing
SET "membershipId" = (
  SELECT membership."id"
  FROM "CohortMembership" AS membership
  WHERE membership."studentId" = billing."studentId"
    AND membership."cohortId" = billing."cohortId"
    AND (membership."activeTo" IS NULL OR membership."activeTo" >= billing."effectiveFrom")
  ORDER BY
    CASE WHEN membership."activeFrom" <= billing."effectiveFrom" THEN 0 ELSE 1 END,
    membership."activeFrom" DESC
  LIMIT 1
)
WHERE billing."cohortId" IS NOT NULL;

ALTER TABLE "BillingProfile"
ADD CONSTRAINT "BillingProfile_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "CohortMembership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BillingProfile_membershipId_effectiveFrom_effectiveTo_idx"
ON "BillingProfile"("membershipId", "effectiveFrom", "effectiveTo");
