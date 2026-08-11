ALTER TABLE "Payment" ADD COLUMN "correctsPaymentId" TEXT;

CREATE UNIQUE INDEX "Payment_correctsPaymentId_key" ON "Payment"("correctsPaymentId");
CREATE INDEX "Payment_correctsPaymentId_idx" ON "Payment"("correctsPaymentId");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_correctsPaymentId_fkey"
FOREIGN KEY ("correctsPaymentId") REFERENCES "Payment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
