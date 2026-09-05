import type { Prisma, PrismaClient } from "@prisma/client";
import { currentPaymentVersions } from "../domain/money";

type Db = PrismaClient | Prisma.TransactionClient;

export async function createTrialPaymentCredits(db: Db, input: { membershipId: string; studentId: string; cohortId: string; destinationPeriodLabel: string }) {
  const payments = await db.payment.findMany({ where: { studentId: input.studentId, cohortId: input.cohortId, billingModel: "PAY_PER_LESSON", billingProfile: { membershipId: input.membershipId } } });
  const creditedSources = new Set((await db.credit.findMany({ where: { sourcePaymentId: { in: payments.map(({ id }) => id) } }, select: { sourcePaymentId: true } })).map(({ sourcePaymentId }) => sourcePaymentId));
  let createdMinor = 0;
  for (const payment of currentPaymentVersions(payments)) {
    if (payment.actualAmountMinor <= 0 || creditedSources.has(payment.id)) continue;
    await db.credit.create({ data: { studentId: input.studentId, sourcePaymentId: payment.id, sourcePeriodLabel: payment.periodLabel, amountMinor: payment.actualAmountMinor, destinationPeriodLabel: input.destinationPeriodLabel, confirmedAt: new Date(), note: "Зачёт пробной оплаты в первый абонемент" } });
    createdMinor += payment.actualAmountMinor;
  }
  return createdMinor;
}
