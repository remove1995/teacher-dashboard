ALTER TABLE "Credit" ADD COLUMN "sourcePaymentId" TEXT;

ALTER TABLE "Credit"
ADD CONSTRAINT "Credit_sourcePaymentId_fkey"
FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Credit_sourcePaymentId_idx" ON "Credit"("sourcePaymentId");
