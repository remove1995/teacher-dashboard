"use server";

import type { BillingModel, CohortKind, CohortMemberStatus, Prisma, StudentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dateOnly, previousDate, todayDate } from "@/lib/domain/dates";
import { normalizeTags, planMembershipChanges, validateCohortParticipants } from "@/lib/domain/people";
import { prisma } from "@/lib/db/prisma";
import { archiveStudentRecord, permanentlyDeleteStudentRecord } from "@/lib/services/student-lifecycle-service";
import { validateMemberBilling } from "@/lib/domain/member-billing";
import { setEffectiveBillingProfile } from "@/lib/services/member-billing-service";
import { createTrialPaymentCredits } from "@/lib/services/trial-credit-service";

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
  return setEffectiveBillingProfile(tx, input);
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
    const membership = activeMemberships.find((item) => item.cohortId === cohortId) ?? await tx.cohortMembership.findFirstOrThrow({ where: { studentId, cohortId, activeTo: null }, orderBy: { activeFrom: "desc" } });
    const billingEffectiveFrom = optional(formData, `billingEffectiveFrom:cohort:${cohortId}`) ?? effectiveFrom;
    await setEffectiveBillingProfile(tx, { studentId, cohortId, membershipId: membership.id, effectiveFrom: billingEffectiveFrom, ...contextBilling(formData, `cohort:${cohortId}`) });
  }

  if (individualEnabled) await setBilling(tx, { studentId, cohortId: null, effectiveFrom: optional(formData, "billingEffectiveFrom:individual") ?? effectiveFrom, ...contextBilling(formData, "individual") });
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
  const result = await archiveStudentRecord(prisma, studentId);
  refreshStudentWorkspaces(studentId);
  return result;
}

export async function deleteStudentForever(studentId: string) {
  const result = await permanentlyDeleteStudentRecord(prisma, studentId);
  refreshStudentWorkspaces(studentId);
  return result;
}

function cohortInput(formData: FormData) {
  const kind = required(formData, "kind") as CohortKind;
  if (kind !== "PAIR" && kind !== "GROUP") throw new Error("Invalid cohort kind");
  const activeFrom = required(formData, "activeFrom");
  const keys = formData.getAll("participantKeys").map(String);
  if (new Set(keys).size !== keys.length) throw new Error("Invalid duplicate participant rows");
  const participants = keys.map((key) => {
    const mode = required(formData, `participantMode:${key}`);
    if (mode !== "existing" && mode !== "new") throw new Error("Invalid participant mode");
    const model = required(formData, `billingModel:${key}`) as BillingModel;
    if (!billingModels.has(model)) throw new Error("Invalid billing model");
    const status = (optional(formData, `participantStatus:${key}`) ?? "REGULAR") as CohortMemberStatus;
    if (status !== "REGULAR" && status !== "TRIAL") throw new Error("Invalid member status");
    const trialLessonDate = optional(formData, `trialLessonDate:${key}`);
    validateMemberBilling({ status, model, trialLessonDate });
    return { key, mode: mode as "existing" | "new", studentId: optional(formData, `participantStudentId:${key}`), name: optional(formData, `participantName:${key}`), model, amountMinor: moneyMinor(required(formData, `rate:${key}`)), rateChangeFrom: optional(formData, `rateChangeFrom:${key}`), status, trialLessonDate, applyTrialCredit: formData.has(`applyTrialCredit:${key}`) };
  });
  validateCohortParticipants(kind, participants);
  return { kind, name: required(formData, "name"), imageUrl: optional(formData, "imageUrl"), color: required(formData, "color"), activeFrom, activeTo: optional(formData, "activeTo"), defaultRateMinor: moneyMinor(required(formData, "defaultRate")), tagNames: tags(formData), participants };
}

type ResolvedParticipant = ReturnType<typeof cohortInput>["participants"][number] & { studentId: string };

async function resolveParticipants(tx: Prisma.TransactionClient, input: ReturnType<typeof cohortInput>) {
  const existingIds = input.participants.filter(({ mode }) => mode === "existing").map(({ studentId }) => studentId!);
  const existing = await tx.student.findMany({ where: { id: { in: existingIds }, archivedAt: null }, select: { id: true } });
  if (existing.length !== existingIds.length) throw new Error("One or more selected students are unavailable");
  const resolved: ResolvedParticipant[] = [];
  for (const participant of input.participants) {
    if (participant.mode === "existing") {
      resolved.push({ ...participant, studentId: participant.studentId! });
      continue;
    }
    const name = participant.name!.trim();
    const duplicate = await tx.student.findFirst({ where: { name: { equals: name, mode: "insensitive" }, archivedAt: null }, select: { id: true } });
    if (duplicate) throw new Error(`Student ${name} already exists; select the existing profile`);
    const student = await tx.student.create({ data: { name, color: input.color, status: "ACTIVE" } });
    resolved.push({ ...participant, studentId: student.id });
  }
  if (new Set(resolved.map(({ studentId }) => studentId)).size !== resolved.length) throw new Error("The same student cannot be added twice");
  return resolved;
}

async function syncMembers(tx: Prisma.TransactionClient, cohortId: string, input: ReturnType<typeof cohortInput>, participants: ResolvedParticipant[]) {
  const today = dateOnly(todayDate());
  const existing = await tx.cohortMembership.findMany({ where: { cohortId, OR: [{ activeTo: null }, { activeTo: { gte: today } }] } });
  const memberIds = participants.map(({ studentId }) => studentId);
  const changes = planMembershipChanges(existing.map(({ studentId }) => studentId), memberIds);
  const closingDate = dateOnly(todayDate());
  const removedIds = changes.removed;
  if (removedIds.length) {
    await tx.cohortMembership.updateMany({ where: { id: { in: existing.filter(({ studentId }) => removedIds.includes(studentId)).map(({ id }) => id) } }, data: { activeTo: closingDate } });
    await tx.billingProfile.updateMany({ where: { cohortId, studentId: { in: removedIds }, effectiveTo: null }, data: { effectiveTo: closingDate } });
  }
  for (const participant of participants) {
    const { studentId } = participant;
    let membership = existing.find((item) => item.studentId === studentId);
    const convertingTrial = membership?.status === "TRIAL" && participant.status === "REGULAR";
    const effectiveFrom = participant.status === "TRIAL" ? participant.trialLessonDate! : changes.added.includes(studentId) ? input.activeFrom : participant.rateChangeFrom ?? todayDate();
    const membershipFrom = participant.status === "TRIAL" ? participant.trialLessonDate! : input.activeFrom;
    if (changes.added.includes(studentId)) membership = await tx.cohortMembership.create({ data: { cohortId, studentId, activeFrom: dateOnly(membershipFrom), status: participant.status, trialLessonDate: participant.trialLessonDate ? dateOnly(participant.trialLessonDate) : null, regularFrom: participant.status === "REGULAR" ? dateOnly(membershipFrom) : null } });
    else membership = await tx.cohortMembership.update({ where: { id: membership!.id }, data: { status: participant.status, trialLessonDate: membership!.trialLessonDate ?? (participant.trialLessonDate ? dateOnly(participant.trialLessonDate) : null), regularFrom: participant.status === "REGULAR" ? membership!.regularFrom ?? dateOnly(effectiveFrom) : null } });
    await setEffectiveBillingProfile(tx, { studentId, cohortId, membershipId: membership.id, model: participant.model, amountMinor: participant.amountMinor, effectiveFrom });
    if (convertingTrial && participant.applyTrialCredit) {
      const periodDate = dateOnly(effectiveFrom);
      const destinationPeriodLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(periodDate).replace(/^./, (letter) => letter.toUpperCase());
      await createTrialPaymentCredits(tx, { membershipId: membership.id, studentId, cohortId, destinationPeriodLabel });
    }
    if (participant.status === "TRIAL" && participant.trialLessonDate) {
      const lesson = await tx.lesson.findFirst({ where: { cohortId, scheduledDate: dateOnly(participant.trialLessonDate) }, orderBy: { startMinute: "asc" } });
      if (lesson) await tx.attendance.upsert({ where: { lessonId_studentId: { lessonId: lesson.id, studentId } }, update: {}, create: { lessonId: lesson.id, studentId, status: "PLANNED" } });
    }
  }
  return memberIds.length;
}

export async function createCohort(formData: FormData) {
  const input = cohortInput(formData);
  const cohort = await prisma.$transaction(async (tx) => {
    const created = await tx.cohort.create({ data: { kind: input.kind, name: input.name, imageUrl: input.imageUrl, color: input.color, activeFrom: dateOnly(input.activeFrom), activeTo: input.activeTo ? dateOnly(input.activeTo) : null, defaultRateMinor: input.defaultRateMinor } });
    await replaceTags(tx, { cohortId: created.id }, input.tagNames);
    const participants = await resolveParticipants(tx, input);
    await syncMembers(tx, created.id, input, participants);
    return created;
  });
  revalidatePath("/students");
  redirect(`/cohorts/${cohort.id}`);
}

export async function updateCohort(cohortId: string, formData: FormData) {
  const input = cohortInput(formData);
  await prisma.$transaction(async (tx) => {
    await tx.cohort.update({ where: { id: cohortId }, data: { kind: input.kind, name: input.name, imageUrl: input.imageUrl, color: input.color, activeFrom: dateOnly(input.activeFrom), activeTo: input.activeTo ? dateOnly(input.activeTo) : null, defaultRateMinor: input.defaultRateMinor } });
    await replaceTags(tx, { cohortId }, input.tagNames);
    const participants = await resolveParticipants(tx, input);
    await syncMembers(tx, cohortId, input, participants);
  });
  revalidatePath("/students");
  revalidatePath(`/cohorts/${cohortId}`);
  redirect(`/cohorts/${cohortId}`);
}
