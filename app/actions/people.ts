"use server";

import type { BillingModel, CohortKind, Prisma, StudentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dateOnly, previousDate, todayDate } from "@/lib/domain/dates";
import { normalizeTags, planMembershipChanges } from "@/lib/domain/people";
import { prisma } from "@/lib/db/prisma";

const billingModels = new Set<BillingModel>(["MONTHLY_PREPAID", "WEEKLY_PREPAID", "PAY_PER_LESSON", "GROUP_SUBSCRIPTION"]);
const studentStatuses = new Set<StudentStatus>(["ACTIVE", "PAUSED", "COMPLETED"]);

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};
const optional = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || null;
const moneyMinor = (value: string) => {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Rate must be a non-negative amount");
  return Math.round(amount * 100);
};
const tags = (formData: FormData) => normalizeTags(String(formData.get("tags") ?? ""));

async function replaceTags(tx: Prisma.TransactionClient, owner: { studentId: string } | { cohortId: string }, names: string[]) {
  if ("studentId" in owner) await tx.studentTag.deleteMany({ where: owner });
  else await tx.cohortTag.deleteMany({ where: owner });
  for (const name of [...new Set(names)]) {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
    if ("studentId" in owner) await tx.studentTag.create({ data: { studentId: owner.studentId, tagId: tag.id } });
    else await tx.cohortTag.create({ data: { cohortId: owner.cohortId, tagId: tag.id } });
  }
}

async function setBilling(tx: Prisma.TransactionClient, input: { studentId: string; cohortId: string | null; model: BillingModel; amountMinor: number; effectiveFrom: string }) {
  const effectiveFrom = dateOnly(input.effectiveFrom);
  const current = await tx.billingProfile.findFirst({ where: { studentId: input.studentId, cohortId: input.cohortId, effectiveFrom: { lte: effectiveFrom }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }] }, orderBy: { effectiveFrom: "desc" } });
  if (current && current.model === input.model && current.amountMinor === input.amountMinor) return current;
  if (current?.effectiveFrom.getTime() === effectiveFrom.getTime()) {
    return tx.billingProfile.update({ where: { id: current.id }, data: { model: input.model, amountMinor: input.amountMinor } });
  }
  if (current) await tx.billingProfile.update({ where: { id: current.id }, data: { effectiveTo: dateOnly(previousDate(input.effectiveFrom)) } });
  return tx.billingProfile.create({ data: { ...input, effectiveFrom } });
}

function studentInput(formData: FormData) {
  const status = required(formData, "status") as StudentStatus;
  if (!studentStatuses.has(status)) throw new Error("Invalid student status");
  return {
    student: { name: required(formData, "name"), imageUrl: optional(formData, "imageUrl"), color: required(formData, "color"), status, yearOrLevel: optional(formData, "yearOrLevel"), notesPrivate: optional(formData, "notesPrivate") },
    tagNames: tags(formData),
  };
}

function contextBilling(formData: FormData, prefix: string) {
  const model = required(formData, `billingModel:${prefix}`) as BillingModel;
  if (!billingModels.has(model)) throw new Error("Invalid billing model");
  return { model, amountMinor: moneyMinor(required(formData, `rate:${prefix}`)) };
}

async function endBillingContext(tx: Prisma.TransactionClient, studentId: string, cohortId: string | null, effectiveFrom: string) {
  const end = dateOnly(previousDate(effectiveFrom));
  await tx.billingProfile.updateMany({
    where: { studentId, cohortId, OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateOnly(effectiveFrom) } }] },
    data: { effectiveTo: end },
  });
}

async function syncStudentContexts(tx: Prisma.TransactionClient, studentId: string, formData: FormData, effectiveFrom: string) {
  const individualEnabled = formData.has("individualEnabled");
  const selectedCohortIds = [...new Set(formData.getAll("contextCohortIds").map(String))];
  if (!individualEnabled && selectedCohortIds.length === 0) throw new Error("Выберите хотя бы один формат обучения");

  const effectiveDate = dateOnly(effectiveFrom);
  const activeMemberships = await tx.cohortMembership.findMany({
    where: { studentId, activeFrom: { lte: effectiveDate }, OR: [{ activeTo: null }, { activeTo: { gte: effectiveDate } }] },
  });
  const activeIds = new Set(activeMemberships.map((membership) => membership.cohortId));
  const selectedIds = new Set(selectedCohortIds);
  const removedIds = [...activeIds].filter((id) => !selectedIds.has(id));
  if (removedIds.length) {
    const end = dateOnly(previousDate(effectiveFrom));
    await tx.cohortMembership.updateMany({ where: { studentId, cohortId: { in: removedIds }, id: { in: activeMemberships.map((membership) => membership.id) } }, data: { activeTo: end } });
    for (const cohortId of removedIds) await endBillingContext(tx, studentId, cohortId, effectiveFrom);
  }

  const cohorts = await tx.cohort.findMany({ where: { id: { in: selectedCohortIds } }, select: { id: true } });
  if (cohorts.length !== selectedCohortIds.length) throw new Error("Один из выбранных учебных контекстов недоступен");
  for (const cohortId of selectedCohortIds) {
    if (!activeIds.has(cohortId)) await tx.cohortMembership.create({ data: { studentId, cohortId, activeFrom: effectiveDate } });
    await setBilling(tx, { studentId, cohortId, effectiveFrom, ...contextBilling(formData, `cohort:${cohortId}`) });
  }

  if (individualEnabled) await setBilling(tx, { studentId, cohortId: null, effectiveFrom, ...contextBilling(formData, "individual") });
  else await endBillingContext(tx, studentId, null, effectiveFrom);
}

export async function createStudent(formData: FormData) {
  const input = studentInput(formData);
  const effectiveFrom = todayDate();
  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({ data: input.student });
    await replaceTags(tx, { studentId: created.id }, input.tagNames);
    await syncStudentContexts(tx, created.id, formData, effectiveFrom);
    return created;
  });
  revalidatePath("/students");
  revalidatePath("/payments");
  redirect(`/students/${student.id}`);
}

export async function updateStudent(studentId: string, formData: FormData) {
  const input = studentInput(formData);
  const effectiveFrom = optional(formData, "contextEffectiveFrom") ?? todayDate();
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: studentId }, data: input.student });
    await replaceTags(tx, { studentId }, input.tagNames);
    await syncStudentContexts(tx, studentId, formData, effectiveFrom);
  });
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/payments");
  redirect(`/students/${studentId}`);
}

function refreshStudentWorkspaces(studentId: string) {
  revalidatePath("/");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/lessons");
  revalidatePath("/calendar");
  revalidatePath("/attendance");
  revalidatePath("/payments");
}

export async function archiveStudent(studentId: string) {
  await prisma.student.update({ where: { id: studentId }, data: { archivedAt: new Date() } });
  refreshStudentWorkspaces(studentId);
  redirect("/students");
}

export async function deleteStudentForever(studentId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.student.findUniqueOrThrow({ where: { id: studentId }, select: { id: true } });
    const [lessons, payments] = await Promise.all([
      tx.lesson.findMany({ where: { studentId }, select: { id: true } }),
      tx.payment.findMany({ where: { studentId }, select: { id: true } }),
    ]);
    const lessonIds = lessons.map(({ id }) => id);
    const paymentIds = payments.map(({ id }) => id);

    if (paymentIds.length) {
      await tx.credit.updateMany({ where: { destinationPaymentId: { in: paymentIds }, studentId: { not: studentId } }, data: { destinationPaymentId: null } });
      await tx.payment.updateMany({ where: { correctsPaymentId: { in: paymentIds } }, data: { correctsPaymentId: null } });
      await tx.attachment.deleteMany({ where: { paymentId: { in: paymentIds } } });
    }
    if (lessonIds.length) {
      await tx.lesson.updateMany({ where: { originalLessonId: { in: lessonIds } }, data: { originalLessonId: null } });
      await tx.credit.updateMany({ where: { sourceLessonId: { in: lessonIds }, studentId: { not: studentId } }, data: { sourceLessonId: null } });
    }

    await tx.credit.deleteMany({ where: { studentId } });
    await tx.attendance.deleteMany({ where: { OR: [{ studentId }, ...(lessonIds.length ? [{ lessonId: { in: lessonIds } }] : [])] } });
    await tx.learningRecord.deleteMany({ where: { studentId } });
    await tx.testResult.deleteMany({ where: { studentId } });
    await tx.payment.deleteMany({ where: { studentId } });
    await tx.lesson.deleteMany({ where: { studentId } });
    await tx.recurringSchedule.deleteMany({ where: { studentId } });
    await tx.billingProfile.deleteMany({ where: { studentId } });
    await tx.cohortMembership.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { id: studentId } });
  });
  refreshStudentWorkspaces(studentId);
  redirect("/students");
}

function cohortInput(formData: FormData) {
  const kind = required(formData, "kind") as CohortKind;
  if (kind !== "PAIR" && kind !== "GROUP") throw new Error("Invalid cohort kind");
  const activeFrom = required(formData, "activeFrom");
  const memberIds = formData.getAll("memberIds").map(String);
  if (kind === "PAIR" && memberIds.length !== 2) throw new Error("A pair must contain exactly two active members");
  if (kind === "GROUP" && memberIds.length < 2) throw new Error("A group must contain at least two active members");
  return { kind, name: required(formData, "name"), color: required(formData, "color"), activeFrom, activeTo: optional(formData, "activeTo"), defaultRateMinor: moneyMinor(required(formData, "defaultRate")), tagNames: tags(formData), memberIds };
}

async function syncMembers(tx: Prisma.TransactionClient, cohortId: string, input: ReturnType<typeof cohortInput>, formData: FormData) {
  const existing = await tx.cohortMembership.findMany({ where: { cohortId, activeTo: null } });
  const changes = planMembershipChanges(existing.map(({ studentId }) => studentId), input.memberIds);
  const closingDate = dateOnly(todayDate());
  const removedIds = changes.removed;
  if (removedIds.length) {
    await tx.cohortMembership.updateMany({ where: { cohortId, activeTo: null, studentId: { in: removedIds } }, data: { activeTo: closingDate } });
    await tx.billingProfile.updateMany({ where: { cohortId, studentId: { in: removedIds }, effectiveTo: null }, data: { effectiveTo: closingDate } });
  }
  for (const studentId of input.memberIds) {
    if (changes.added.includes(studentId)) await tx.cohortMembership.create({ data: { cohortId, studentId, activeFrom: dateOnly(input.activeFrom) } });
    const model = required(formData, `billingModel:${studentId}`) as BillingModel;
    if (!billingModels.has(model)) throw new Error("Invalid billing model");
    const effectiveFrom = changes.added.includes(studentId) ? input.activeFrom : optional(formData, `rateChangeFrom:${studentId}`) ?? todayDate();
    await setBilling(tx, { studentId, cohortId, model, amountMinor: moneyMinor(required(formData, `rate:${studentId}`)), effectiveFrom });
  }
  return input.memberIds.length;
}

export async function createCohort(formData: FormData) {
  const input = cohortInput(formData);
  const cohort = await prisma.$transaction(async (tx) => {
    const created = await tx.cohort.create({ data: { kind: input.kind, name: input.name, color: input.color, activeFrom: dateOnly(input.activeFrom), activeTo: input.activeTo ? dateOnly(input.activeTo) : null, defaultRateMinor: input.defaultRateMinor } });
    await replaceTags(tx, { cohortId: created.id }, input.tagNames);
    await syncMembers(tx, created.id, input, formData);
    return created;
  });
  revalidatePath("/students");
  redirect(`/cohorts/${cohort.id}`);
}

export async function updateCohort(cohortId: string, formData: FormData) {
  const input = cohortInput(formData);
  await prisma.$transaction(async (tx) => {
    await tx.cohort.update({ where: { id: cohortId }, data: { kind: input.kind, name: input.name, color: input.color, activeFrom: dateOnly(input.activeFrom), activeTo: input.activeTo ? dateOnly(input.activeTo) : null, defaultRateMinor: input.defaultRateMinor } });
    await replaceTags(tx, { cohortId }, input.tagNames);
    await syncMembers(tx, cohortId, input, formData);
  });
  revalidatePath("/students");
  revalidatePath(`/cohorts/${cohortId}`);
  redirect(`/cohorts/${cohortId}`);
}
