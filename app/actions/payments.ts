"use server";

import { BillingModel, PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { paymentStatus } from "@/lib/domain/money";
import { splitCreditApplication } from "@/lib/domain/trial-credit";

const date = (value: FormDataEntryValue | null) => {
  if (!value) throw new Error("Укажите дату");
  const parsed = new Date(`${String(value)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Некорректная дата");
  return parsed;
};

const minor = (value: FormDataEntryValue | null, label: string) => {
  const normalized = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label}: укажите положительную сумму`);
  return Math.round(amount * 100);
};

const persistedStatus = (expected: number, actual: number): PaymentStatus => {
  const status = paymentStatus(expected, actual);
  if (status === "OVERPAID") return "PAID";
  return status;
};

export async function createPayment(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "") || null;
  const billingProfileId = String(formData.get("billingProfileId") ?? "");
  const periodLabel = String(formData.get("periodLabel") ?? "").trim();
  const periodStart = date(formData.get("periodStart"));
  const periodEnd = date(formData.get("periodEnd"));
  const paymentDate = date(formData.get("paymentDate"));
  const calculatedMinor = minor(formData.get("calculatedAmount"), "Расчётная сумма");
  const suggestedAmountMinor = minor(formData.get("suggestedAmount"), "Ожидаемая сумма");
  const actualAmountMinor = minor(formData.get("actualAmount"), "Получено");
  const billingModel = String(formData.get("billingModel")) as BillingModel;
  const profile = await prisma.billingProfile.findFirst({ where: { id: billingProfileId, studentId, cohortId } });
  if (!profile || profile.model !== billingModel) throw new Error("Профиль оплаты больше не доступен");
  if (periodEnd < periodStart) throw new Error("Конец периода раньше начала");

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: {
      studentId, cohortId, billingProfileId, periodLabel, periodStart, periodEnd, paymentDate,
      suggestedAmountMinor, actualAmountMinor,
      calculationNote: String(formData.get("calculationNote") ?? "Расчёт по профилю оплаты"),
      manuallyOverridden: suggestedAmountMinor !== calculatedMinor,
      billingModel, status: persistedStatus(suggestedAmountMinor, actualAmountMinor),
      comment: String(formData.get("comment") ?? "").trim() || null,
      receiptUrl: String(formData.get("receiptUrl") ?? "").trim() || null,
    } });
    let remainingCredit = Math.max(0, minor(formData.get("creditApplied"), "Кредит"));
    if (remainingCredit) {
      const credits = await tx.credit.findMany({ where: { studentId, status: "AVAILABLE", AND: [{ OR: [{ destinationPeriodLabel: null }, { destinationPeriodLabel: periodLabel }] }, { OR: [{ sourcePaymentId: null }, { sourcePayment: { cohortId } }] }] }, orderBy: { confirmedAt: "asc" } });
      for (const credit of credits) {
        if (remainingCredit <= 0) break;
        const allocation = splitCreditApplication(credit.amountMinor, remainingCredit);
        if (!allocation.appliedMinor) continue;
        await tx.credit.update({ where: { id: credit.id }, data: { amountMinor: allocation.appliedMinor, status: "APPLIED", destinationPaymentId: payment.id, destinationPeriodLabel: periodLabel } });
        if (allocation.remainingMinor) await tx.credit.create({ data: { studentId: credit.studentId, sourceLessonId: credit.sourceLessonId, sourcePaymentId: credit.sourcePaymentId, sourcePeriodLabel: credit.sourcePeriodLabel, amountMinor: allocation.remainingMinor, status: "AVAILABLE", confirmedAt: credit.confirmedAt, note: credit.note } });
        remainingCredit -= allocation.appliedMinor;
      }
    }
  });
  revalidatePath("/payments");
  redirect(`/payments?month=${periodStart.toISOString().slice(0, 7)}`);
}

export async function correctPayment(formData: FormData) {
  const paymentId = String(formData.get("paymentId") ?? "");
  const original = await prisma.payment.findUnique({ where: { id: paymentId }, include: { correction: true } });
  if (!original || original.correction) throw new Error("Платёж не найден или уже исправлен");
  const actualAmountMinor = minor(formData.get("actualAmount"), "Получено");
  await prisma.payment.create({ data: {
    studentId: original.studentId, cohortId: original.cohortId, billingProfileId: original.billingProfileId,
    periodLabel: original.periodLabel, periodStart: original.periodStart, periodEnd: original.periodEnd,
    paymentDate: date(formData.get("paymentDate")), suggestedAmountMinor: original.suggestedAmountMinor,
    actualAmountMinor, calculationNote: original.calculationNote, manuallyOverridden: original.manuallyOverridden,
    billingModel: original.billingModel, status: persistedStatus(original.suggestedAmountMinor, actualAmountMinor),
    comment: String(formData.get("comment") ?? "").trim() || null,
    receiptUrl: String(formData.get("receiptUrl") ?? "").trim() || null,
    correctsPaymentId: original.id,
  } });
  revalidatePath("/payments");
  redirect(`/payments?month=${original.periodStart.toISOString().slice(0, 7)}`);
}
