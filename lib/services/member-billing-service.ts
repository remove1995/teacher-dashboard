import type { BillingModel, Prisma, PrismaClient } from "@prisma/client";
import { dateOnly, previousDate } from "../domain/dates";

type Db = PrismaClient | Prisma.TransactionClient;

export async function setEffectiveBillingProfile(db: Db, input: { studentId: string; cohortId: string | null; membershipId?: string | null; model: BillingModel; amountMinor: number; effectiveFrom: string }) {
  const effectiveFrom = dateOnly(input.effectiveFrom);
  const context = input.membershipId
    ? { OR: [{ membershipId: input.membershipId }, { membershipId: null, studentId: input.studentId, cohortId: input.cohortId }] }
    : { studentId: input.studentId, cohortId: input.cohortId };
  const profiles = await db.billingProfile.findMany({ where: context, orderBy: { effectiveFrom: "asc" } });
  const exact = profiles.find((profile) => profile.effectiveFrom.getTime() === effectiveFrom.getTime());
  const active = [...profiles].reverse().find((profile) => profile.effectiveFrom <= effectiveFrom && (!profile.effectiveTo || profile.effectiveTo >= effectiveFrom));
  if (exact) {
    if (exact.model === input.model && exact.amountMinor === input.amountMinor) return exact;
    return db.billingProfile.update({ where: { id: exact.id }, data: { model: input.model, amountMinor: input.amountMinor, membershipId: input.membershipId ?? exact.membershipId } });
  }
  if (active?.model === input.model && active.amountMinor === input.amountMinor) return active;
  const overlapping = profiles.filter((profile) => profile.effectiveFrom < effectiveFrom && (!profile.effectiveTo || profile.effectiveTo >= effectiveFrom));
  if (overlapping.length) await db.billingProfile.updateMany({ where: { id: { in: overlapping.map(({ id }) => id) } }, data: { effectiveTo: dateOnly(previousDate(input.effectiveFrom)) } });
  const next = profiles.find((profile) => profile.effectiveFrom > effectiveFrom);
  return db.billingProfile.create({ data: { studentId: input.studentId, cohortId: input.cohortId, membershipId: input.membershipId ?? null, model: input.model, amountMinor: input.amountMinor, effectiveFrom, effectiveTo: next ? dateOnly(previousDate(next.effectiveFrom.toISOString().slice(0, 10))) : null } });
}
