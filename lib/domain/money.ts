export type BillingModel = "MONTHLY_PREPAID" | "WEEKLY_PREPAID" | "PAY_PER_LESSON" | "GROUP_SUBSCRIPTION";
export type FinanceEntityKind = "INDIVIDUAL" | "PAIR" | "GROUP";
export type DerivedPaymentStatus = "EXPECTED" | "PARTIALLY_PAID" | "PAID" | "OVERPAID";

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
  lessonCount: number | null;
  explanation: string;
};

export type PaymentVersion = {
  id: string;
  correctsPaymentId?: string | null;
  actualAmountMinor: number;
  suggestedAmountMinor: number;
  paymentDate?: Date | null;
};

export type LessonEarning = {
  id: string;
  status: string;
  scheduledDate?: Date;
  originalLessonId?: string | null;
  valueMinor: number;
};

function assertMinorUnits(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in minor units`);
}

function count(value: number | undefined, name: string) {
  const resolved = value ?? 0;
  if (!Number.isSafeInteger(resolved) || resolved < 0) throw new Error(`${name} must be a non-negative integer`);
  return resolved;
}

const calculationMoney = (minor: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(minor / 100)} ₽`;

export function suggestPayment(input: PaymentSuggestionInput): PaymentSuggestion {
  assertMinorUnits(input.unitAmountMinor, "unitAmountMinor");
  const credit = input.availableCreditMinor ?? 0;
  assertMinorUnits(credit, "availableCreditMinor");

  const lessonCount = input.model === "GROUP_SUBSCRIPTION"
    ? null
    : input.model === "PAY_PER_LESSON"
      ? count(input.completedUnpaidLessonCount, "completedUnpaidLessonCount")
      : count(input.scheduledLessonCount, "scheduledLessonCount");
  const gross = lessonCount === null ? input.unitAmountMinor : lessonCount * input.unitAmountMinor;
  if (!Number.isSafeInteger(gross)) throw new Error("calculated amount exceeds safe integer range");
  const appliedCredit = Math.min(credit, gross);
  const amountMinor = gross - appliedCredit;
  const base = input.model === "GROUP_SUBSCRIPTION"
    ? `Абонемент: ${calculationMoney(input.unitAmountMinor)}`
    : `${lessonCount} × ${calculationMoney(input.unitAmountMinor)}`;
  return {
    amountMinor,
    grossAmountMinor: gross,
    creditAppliedMinor: appliedCredit,
    lessonCount,
    explanation: `${base}${appliedCredit ? ` − кредит ${calculationMoney(appliedCredit)}` : ""}`,
  };
}

export function paymentStatus(expectedMinor: number, receivedMinor: number): DerivedPaymentStatus {
  assertMinorUnits(expectedMinor, "expectedMinor");
  assertMinorUnits(receivedMinor, "receivedMinor");
  if (receivedMinor > expectedMinor) return "OVERPAID";
  if (expectedMinor > 0 && receivedMinor === expectedMinor) return "PAID";
  if (receivedMinor > 0) return "PARTIALLY_PAID";
  return "EXPECTED";
}

export function currentPaymentVersions<T extends PaymentVersion>(payments: T[]): T[] {
  const superseded = new Set(payments.map((payment) => payment.correctsPaymentId).filter((id): id is string => Boolean(id)));
  return payments.filter((payment) => !superseded.has(payment.id));
}

export function cumulativeReceived(payments: PaymentVersion[]) {
  return currentPaymentVersions(payments).reduce((sum, payment) => sum + payment.actualAmountMinor, 0);
}

export function expectedForPaymentPeriod(payments: PaymentVersion[], fallback = 0) {
  const current = currentPaymentVersions(payments);
  return current.length ? current.reduce((maximum, payment) => Math.max(maximum, payment.suggestedAmountMinor), 0) : fallback;
}

/**
 * Reconciles a PAY_PER_LESSON account without treating independent lesson
 * receipts as partial payments against one shared expected amount.
 *
 * The calculated service value remains authoritative. Historical receipts can
 * additionally prove that separate expected charges were settled, while an
 * amount above an individual receipt's expectation remains a real overpayment.
 */
export function expectedForPerLessonPeriod(payments: PaymentVersion[], calculatedMinor = 0) {
  assertMinorUnits(calculatedMinor, "calculatedMinor");
  const coveredExpected = currentPaymentVersions(payments).reduce(
    (sum, payment) => sum + Math.min(payment.actualAmountMinor, payment.suggestedAmountMinor),
    0,
  );
  return Math.max(calculatedMinor, coveredExpected);
}

export const paymentAccountKey = (studentId: string, cohortId: string | null) => `${studentId}:${cohortId ?? "individual"}`;

/** Automatic payment snapshots are history, not the current service charge. */
export function expectedForBillablePeriod(payments: Array<PaymentVersion & { manuallyOverridden?: boolean }>, calculatedMinor: number) {
  assertMinorUnits(calculatedMinor, "calculatedMinor");
  const overrides = currentPaymentVersions(payments).filter((payment) => payment.manuallyOverridden);
  return overrides.length ? expectedForPaymentPeriod(overrides, calculatedMinor) : calculatedMinor;
}

/** A reschedule link identifies one service; cancellation is not a service. */
export function billableLessonServices<T extends { id: string; status: string; originalLessonId?: string | null }>(lessons: T[], completedOnly = false): T[] {
  const seen = new Set<string>();
  return lessons.filter((lesson) => {
    if (completedOnly ? lesson.status !== "COMPLETED" : !["PLANNED", "COMPLETED"].includes(lesson.status)) return false;
    const key = lesson.originalLessonId ?? lesson.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cashReceived(payments: Array<PaymentVersion & { paymentDate?: Date | null }>) {
  return cumulativeReceived(payments.filter((payment) => payment.paymentDate));
}

export function cashReceivedInPeriod(payments: Array<PaymentVersion & { paymentDate?: Date | null }>, start: Date, end: Date) {
  return currentPaymentVersions(payments)
    .filter((payment) => payment.paymentDate && payment.paymentDate >= start && payment.paymentDate <= end)
    .reduce((sum, payment) => sum + payment.actualAmountMinor, 0);
}

export function earnedIncome(lessons: LessonEarning[]) {
  const countedServices = new Set<string>();
  return lessons.reduce((sum, lesson) => {
    assertMinorUnits(lesson.valueMinor, "valueMinor");
    const serviceId = lesson.originalLessonId ?? lesson.id;
    if (lesson.status !== "COMPLETED" || countedServices.has(serviceId)) return sum;
    countedServices.add(serviceId);
    return sum + lesson.valueMinor;
  }, 0);
}

export function resolveEffectiveRate<T extends { effectiveFrom: Date; effectiveTo?: Date | null }>(profiles: T[], date: Date): T | null {
  return profiles
    .filter((profile) => profile.effectiveFrom <= date && (!profile.effectiveTo || profile.effectiveTo >= date))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null;
}

export function resolveProfileForPeriod<T extends { effectiveFrom: Date; effectiveTo?: Date | null }>(profiles: T[], start: Date, end: Date): T | null {
  return profiles
    .filter((profile) => profile.effectiveFrom <= end && (!profile.effectiveTo || profile.effectiveTo >= start))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null;
}

export function resolveManualSuggestion(calculatedMinor: number, enteredMinor: number | null) {
  assertMinorUnits(calculatedMinor, "calculatedMinor");
  if (enteredMinor === null) return { amountMinor: calculatedMinor, manuallyOverridden: false };
  assertMinorUnits(enteredMinor, "enteredMinor");
  return { amountMinor: enteredMinor, manuallyOverridden: enteredMinor !== calculatedMinor };
}

export function filterFinanceRows<T extends { kind: FinanceEntityKind; name: string; searchText?: string; status: DerivedPaymentStatus }>(
  rows: T[],
  filters: { kind?: "ALL" | FinanceEntityKind; status?: "ALL" | DerivedPaymentStatus; search?: string },
) {
  const needle = filters.search?.trim().toLocaleLowerCase("ru-RU") ?? "";
  return rows.filter((row) =>
    (!filters.kind || filters.kind === "ALL" || row.kind === filters.kind)
    && (!filters.status || filters.status === "ALL" || row.status === filters.status)
    && (!needle || (row.searchText ?? row.name).toLocaleLowerCase("ru-RU").includes(needle)),
  );
}
