import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";
import { monthlyExtraIncomeTotal, normalizeIncomeCategory, validateExtraIncome, type ExtraIncomeInput } from "../domain/extra-income";

export async function getExtraIncomeWorkspace(period: { start: Date; end: Date }, client: PrismaClient = prisma) {
  const [records, tags] = await Promise.all([
    client.extraIncome.findMany({ where: { receivedAt: { gte: period.start, lte: period.end } }, include: { tag: true }, orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }] }),
    client.incomeTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, normalizedName: true } }),
  ]);
  return { records, tags, receivedMinor: monthlyExtraIncomeTotal(records, period.start, period.end) };
}

export async function saveExtraIncomeRecord(id: string | null, input: ExtraIncomeInput, client: PrismaClient = prisma) {
  const { category, ...data } = validateExtraIncome(input);
  return client.$transaction(async (tx) => {
    const tag = await tx.incomeTag.upsert({ where: { normalizedName: normalizeIncomeCategory(category) }, update: {}, create: { name: category, normalizedName: normalizeIncomeCategory(category) } });
    return id ? tx.extraIncome.update({ where: { id }, data: { ...data, tagId: tag.id } }) : tx.extraIncome.create({ data: { ...data, tagId: tag.id } });
  });
}

export async function deleteExtraIncomeRecord(id: string, client: PrismaClient = prisma) {
  return client.extraIncome.delete({ where: { id } });
}
