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

function studentInput(formData: FormData, billingEffectiveFrom: string) {
  const status = required(formData, "status") as StudentStatus;
  const model = required(formData, "billingModel") as BillingModel;
  if (!studentStatuses.has(status) || !billingModels.has(model)) throw new Error("Invalid student status or billing model");
  return {
    student: { name: required(formData, "name"), imageUrl: optional(formData, "imageUrl"), color: required(formData, "color"), status, yearOrLevel: optional(formData, "yearOrLevel"), notesPrivate: optional(formData, "notesPrivate") },
    tagNames: tags(formData),
    billing: { model, amountMinor: moneyMinor(required(formData, "rate")), effectiveFrom: billingEffectiveFrom },
  };
}

export async function createStudent(formData: FormData) {
  const input = studentInput(formData, todayDate());
  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({ data: input.student });
    await replaceTags(tx, { studentId: created.id }, input.tagNames);
    await setBilling(tx, { studentId: created.id, cohortId: null, ...input.billing });
    return created;
  });
  revalidatePath("/students");
  redirect(`/students/${student.id}`);
}

export async function updateStudent(studentId: string, formData: FormData) {
  const input = studentInput(formData, optional(formData, "rateChangeFrom") ?? todayDate());
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: studentId }, data: input.student });
    await replaceTags(tx, { studentId }, input.tagNames);
    await setBilling(tx, { studentId, cohortId: null, ...input.billing });
  });
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
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
