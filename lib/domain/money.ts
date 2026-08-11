export type BillingModel =
  | "MONTHLY_PREPAID"
  | "WEEKLY_PREPAID"
  | "PAY_PER_LESSON"
  | "GROUP_SUBSCRIPTION";

export type PaymentSuggestionInput = {
  model: BillingModel;
  unitAmountMinor: number;
  scheduledLessonCount?: number;
  completedUnpaidLessonCount?: number;
  availableCreditMinor?: number;
};

export type PaymentSuggestion = {
  amountMinor: number;
  grossAmountMinor: number;
  creditAppliedMinor: number;
  explanation: string;
};

function assertMinorUnits(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in minor units`);
}

function count(value: number | undefined, name: string) {
  const resolved = value ?? 0;
  if (!Number.isSafeInteger(resolved) || resolved < 0) throw new Error(`${name} must be a non-negative integer`);
  return resolved;
}

export function suggestPayment(input: PaymentSuggestionInput): PaymentSuggestion {
  assertMinorUnits(input.unitAmountMinor, "unitAmountMinor");
  const credit = input.availableCreditMinor ?? 0;
  assertMinorUnits(credit, "availableCreditMinor");

  if (input.model === "GROUP_SUBSCRIPTION") {
    return { amountMinor: input.unitAmountMinor, grossAmountMinor: input.unitAmountMinor, creditAppliedMinor: 0, explanation: "Participant subscription price" };
  }

  const lessonCount = input.model === "PAY_PER_LESSON"
    ? count(input.completedUnpaidLessonCount, "completedUnpaidLessonCount")
    : count(input.scheduledLessonCount, "scheduledLessonCount");
  const gross = lessonCount * input.unitAmountMinor;
  if (!Number.isSafeInteger(gross)) throw new Error("calculated amount exceeds safe integer range");
  const applicableCredit = input.model === "MONTHLY_PREPAID" ? Math.min(credit, gross) : 0;
  const label = input.model === "PAY_PER_LESSON" ? "completed unpaid lessons" : "scheduled lessons";
  return {
    amountMinor: gross - applicableCredit,
    grossAmountMinor: gross,
    creditAppliedMinor: applicableCredit,
    explanation: `${lessonCount} ${label} × ${input.unitAmountMinor}${applicableCredit ? ` − ${applicableCredit} credit` : ""}`,
  };
}

export function paymentStatus(expectedMinor: number, paidMinor: number, overdue = false) {
  assertMinorUnits(expectedMinor, "expectedMinor");
  assertMinorUnits(paidMinor, "paidMinor");
  if (paidMinor >= expectedMinor) return "PAID" as const;
  if (paidMinor > 0) return "PARTIALLY_PAID" as const;
  return overdue ? "OVERDUE" as const : "EXPECTED" as const;
}

export function cashReceived(payments: Array<{ actualAmountMinor: number; status: string }>) {
  return payments.reduce((sum, payment) => {
    assertMinorUnits(payment.actualAmountMinor, "actualAmountMinor");
    return payment.status === "PAID" || payment.status === "PARTIALLY_PAID" ? sum + payment.actualAmountMinor : sum;
  }, 0);
}

export function earnedIncome(lessons: Array<{ id: string; status: string; valueMinor: number; originalLessonId?: string | null }>) {
  const countedServices = new Set<string>();
  return lessons.reduce((sum, lesson) => {
    assertMinorUnits(lesson.valueMinor, "valueMinor");
    const serviceId = lesson.originalLessonId ?? lesson.id;
    if (lesson.status !== "COMPLETED" || countedServices.has(serviceId)) return sum;
    countedServices.add(serviceId);
    return sum + lesson.valueMinor;
  }, 0);
}
