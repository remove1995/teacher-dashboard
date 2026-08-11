import type { BillingModel, CohortKind, LessonStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  cumulativeReceived, earnedIncome, expectedForPaymentPeriod, paymentStatus,
  resolveEffectiveRate, resolveProfileForPeriod, suggestPayment, type DerivedPaymentStatus, type FinanceEntityKind,
} from "@/lib/domain/money";
import { contextActiveInPeriod } from "@/lib/domain/people";

export type FinancePeriod = { start: Date; end: Date; label: string; key: string };
export type FinancePayment = {
  id: string; date: string | null; amountMinor: number; comment: string | null; receiptUrl: string | null;
  manuallyOverridden: boolean; correctsPaymentId: string | null;
};
export type FinanceParticipant = {
  key: string; studentId: string; cohortId: string | null; billingProfileId: string; name: string; contextName: string;
  kind: FinanceEntityKind; billingModel: BillingModel; unitAmountMinor: number;
  expectedMinor: number; receivedMinor: number; balanceMinor: number; creditMinor: number;
  status: DerivedPaymentStatus; calculationNote: string; lessonCount: number | null;
  lastPaymentDate: string | null; receiptUrl: string | null; payments: FinancePayment[];
};
export type FinanceParentRow = {
  id: string; name: string; searchText: string; kind: FinanceEntityKind; color: string; participants: FinanceParticipant[];
  expectedMinor: number; receivedMinor: number; balanceMinor: number; status: DerivedPaymentStatus;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function monthPeriod(month: string): FinancePeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start, end, key: iso(start).slice(0, 7), label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(start).replace(/^./, (letter) => letter.toUpperCase()) };
}

export function shiftMonth(period: FinancePeriod, amount: number) {
  return iso(new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth() + amount, 1))).slice(0, 7);
}

function distinctServices(lessons: Array<{ id: string; originalLessonId: string | null; status: LessonStatus }>, completedOnly: boolean) {
  const ids = new Set<string>();
  for (const lesson of lessons) {
    if (completedOnly ? lesson.status !== "COMPLETED" : lesson.status === "CANCELLED" || lesson.status === "RESCHEDULED") continue;
    ids.add(lesson.originalLessonId ?? lesson.id);
  }
  return ids.size;
}

function aggregateStatus(statuses: DerivedPaymentStatus[]): DerivedPaymentStatus {
  if (statuses.some((status) => status === "OVERPAID")) return "OVERPAID";
  if (statuses.every((status) => status === "PAID")) return "PAID";
  if (statuses.some((status) => status === "PAID" || status === "PARTIALLY_PAID")) return "PARTIALLY_PAID";
  return "EXPECTED";
}

export async function getFinanceWorkspace(period: FinancePeriod) {
  const [students, cohorts, lessons, credits, payments] = await Promise.all([
    prisma.student.findMany({
      where: { status: { not: "COMPLETED" } }, orderBy: { name: "asc" },
      include: { billingProfiles: { orderBy: { effectiveFrom: "desc" } }, memberships: true },
    }),
    prisma.cohort.findMany({
      where: { activeFrom: { lte: period.end }, OR: [{ activeTo: null }, { activeTo: { gte: period.start } }] },
      orderBy: { name: "asc" }, include: { memberships: { include: { student: { include: { billingProfiles: { orderBy: { effectiveFrom: "desc" } } } } } } },
    }),
    prisma.lesson.findMany({
      where: { scheduledDate: { gte: period.start, lte: period.end } },
      select: { id: true, studentId: true, cohortId: true, scheduledDate: true, status: true, originalLessonId: true },
    }),
    prisma.credit.findMany({ where: { status: "AVAILABLE" }, select: { studentId: true, amountMinor: true, destinationPeriodLabel: true } }),
    prisma.payment.findMany({
      where: { periodStart: { lte: period.end }, periodEnd: { gte: period.start } }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const participant = (student: typeof students[number], cohort: { id: string; name: string; kind: CohortKind } | null, membership?: { activeFrom: Date; activeTo: Date | null }): FinanceParticipant | null => {
    const profiles = student.billingProfiles.filter((profile) => profile.cohortId === cohort?.id || (!cohort && profile.cohortId === null));
    const profile = resolveProfileForPeriod(profiles, period.start, period.end);
    if (!profile) return null;
    const contextFrom = membership && membership.activeFrom > profile.effectiveFrom ? membership.activeFrom : profile.effectiveFrom;
    const contextTo = membership?.activeTo && (!profile.effectiveTo || membership.activeTo < profile.effectiveTo) ? membership.activeTo : profile.effectiveTo;
    const relevantLessons = lessons.filter((lesson) => (cohort ? lesson.cohortId === cohort.id : lesson.studentId === student.id) && lesson.scheduledDate >= contextFrom && (!contextTo || lesson.scheduledDate <= contextTo));
    const scheduledLessonCount = distinctServices(relevantLessons, false);
    const completedLessonCount = distinctServices(relevantLessons, true);
    const creditMinor = credits
      .filter((credit) => credit.studentId === student.id && (!credit.destinationPeriodLabel || credit.destinationPeriodLabel === period.label))
      .reduce((sum, credit) => sum + credit.amountMinor, 0);
    const suggestion = suggestPayment({
      model: profile.model,
      unitAmountMinor: profile.amountMinor,
      scheduledLessonCount,
      completedUnpaidLessonCount: completedLessonCount,
      availableCreditMinor: creditMinor,
    });
    const relevantPayments = payments.filter((payment) => payment.studentId === student.id && payment.cohortId === (cohort?.id ?? null));
    const expectedMinor = expectedForPaymentPeriod(relevantPayments, suggestion.amountMinor);
    const receivedMinor = cumulativeReceived(relevantPayments);
    const currentIds = new Set(relevantPayments.map((payment) => payment.correctsPaymentId).filter(Boolean));
    const currentPayments = relevantPayments.filter((payment) => !currentIds.has(payment.id));
    return {
      key: `${student.id}:${cohort?.id ?? "individual"}`, studentId: student.id, cohortId: cohort?.id ?? null, billingProfileId: profile.id,
      name: student.name, contextName: cohort?.name ?? "Индивидуально", kind: cohort?.kind ?? "INDIVIDUAL",
      billingModel: profile.model, unitAmountMinor: profile.amountMinor, expectedMinor, receivedMinor,
      balanceMinor: receivedMinor - expectedMinor, creditMinor, status: paymentStatus(expectedMinor, receivedMinor),
      calculationNote: suggestion.explanation, lessonCount: suggestion.lessonCount,
      lastPaymentDate: currentPayments.find((payment) => payment.paymentDate)?.paymentDate ? iso(currentPayments.find((payment) => payment.paymentDate)!.paymentDate!) : null,
      receiptUrl: currentPayments.find((payment) => payment.receiptUrl)?.receiptUrl ?? null,
      payments: relevantPayments.map((payment) => ({ id: payment.id, date: payment.paymentDate ? iso(payment.paymentDate) : null, amountMinor: payment.actualAmountMinor, comment: payment.comment, receiptUrl: payment.receiptUrl, manuallyOverridden: payment.manuallyOverridden, correctsPaymentId: payment.correctsPaymentId })),
    };
  };

  const rows: FinanceParentRow[] = [];
  for (const student of students) {
    const item = participant(student, null);
    if (!item) continue;
    rows.push({ id: `student:${student.id}`, name: student.name, searchText: student.name, kind: "INDIVIDUAL", color: student.color, participants: [item], expectedMinor: item.expectedMinor, receivedMinor: item.receivedMinor, balanceMinor: item.balanceMinor, status: item.status });
  }
  for (const cohort of cohorts) {
    const members = cohort.memberships
      .filter((membership) => contextActiveInPeriod(membership.activeFrom, membership.activeTo, period.start, period.end))
      .map((membership) => participant(membership.student as typeof students[number], cohort, membership))
      .filter((item): item is FinanceParticipant => Boolean(item));
    if (!members.length) continue;
    const expectedMinor = members.reduce((sum, item) => sum + item.expectedMinor, 0);
    const receivedMinor = members.reduce((sum, item) => sum + item.receivedMinor, 0);
    rows.push({ id: `cohort:${cohort.id}`, name: cohort.name, searchText: `${cohort.name} ${members.map((member) => member.name).join(" ")}`, kind: cohort.kind, color: cohort.color, participants: members, expectedMinor, receivedMinor, balanceMinor: receivedMinor - expectedMinor, status: aggregateStatus(members.map((item) => item.status)) });
  }

  const allPaymentVersions = await prisma.payment.findMany();
  const currentPaymentIds = new Set(allPaymentVersions.map((payment) => payment.correctsPaymentId).filter(Boolean));
  const receivedMinor = cumulativeReceived(allPaymentVersions.filter((payment) => !currentPaymentIds.has(payment.id) && payment.paymentDate && payment.paymentDate >= period.start && payment.paymentDate <= period.end));
  let earnedMinor = 0;
  for (const lesson of lessons) {
    if (lesson.status !== "COMPLETED") continue;
    if (lesson.studentId) {
      const student = students.find((item) => item.id === lesson.studentId);
      const profile = student && resolveEffectiveRate(student.billingProfiles.filter((item) => item.cohortId === null), lesson.scheduledDate);
      if (profile) earnedMinor += earnedIncome([{ ...lesson, valueMinor: profile.amountMinor }]);
    } else if (lesson.cohortId) {
      const cohort = cohorts.find((item) => item.id === lesson.cohortId);
      if (!cohort) continue;
      const scheduledCount = Math.max(1, distinctServices(lessons.filter((item) => item.cohortId === cohort.id), false));
      for (const membership of cohort.memberships.filter((item) => contextActiveInPeriod(item.activeFrom, item.activeTo, period.start, period.end))) {
        const profile = resolveEffectiveRate(membership.student.billingProfiles.filter((item) => item.cohortId === cohort.id), lesson.scheduledDate);
        if (!profile) continue;
        earnedMinor += profile.model === "GROUP_SUBSCRIPTION" ? Math.round(profile.amountMinor / scheduledCount) : profile.amountMinor;
      }
    }
  }

  return {
    rows,
    summary: {
      expectedMinor: rows.reduce((sum, row) => sum + row.expectedMinor, 0), receivedMinor, earnedMinor,
      outstandingMinor: rows.reduce((sum, row) => sum + Math.max(0, -row.balanceMinor), 0),
      creditMinor: rows.flatMap((row) => row.participants).reduce((sum, item) => sum + item.creditMinor, 0),
    },
  };
}
