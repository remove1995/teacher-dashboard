-- Independent actual cash income; no changes to student finance history.
CREATE TABLE "IncomeTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncomeTag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExtraIncome" (
  "id" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "receivedAt" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "receiptUrl" TEXT,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExtraIncome_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExtraIncome_amount_positive" CHECK ("amountMinor" > 0)
);
CREATE UNIQUE INDEX "IncomeTag_normalizedName_key" ON "IncomeTag"("normalizedName");
CREATE INDEX "ExtraIncome_receivedAt_idx" ON "ExtraIncome"("receivedAt");
CREATE INDEX "ExtraIncome_tagId_receivedAt_idx" ON "ExtraIncome"("tagId", "receivedAt");
ALTER TABLE "ExtraIncome" ADD CONSTRAINT "ExtraIncome_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "IncomeTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
