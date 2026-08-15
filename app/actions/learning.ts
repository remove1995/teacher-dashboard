"use server";

import type { LearningRecordKind, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { dateOnly } from "@/lib/domain/dates";
import { testPercentage, type LearningEntryType } from "@/lib/domain/learning";
import { storeLearningAttachment } from "@/lib/storage/learning-attachment-storage";

const required = (data: FormData, key: string) => { const value = String(data.get(key) ?? "").trim(); if (!value) throw new Error(`${key} is required`); return value; };
const optional = (data: FormData, key: string) => String(data.get(key) ?? "").trim() || null;
const numberOrNull = (value: FormDataEntryValue | null) => { const text = String(value ?? "").trim().replace(",", "."); if (!text) return null; const parsed = Number(text); if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Некорректный результат"); return parsed; };
const refresh = (studentId: string) => { revalidatePath(`/students/${studentId}`); revalidatePath(`/students/${studentId}/learning`); };

async function relations(tx: Prisma.TransactionClient, studentId: string, data: FormData, preservedCohortId: string | null = null) {
  const sourceLessonId = optional(data, "sourceLessonId");
  if (!sourceLessonId) return { sourceLessonId: null, cohortId: preservedCohortId };
  const memberships = await tx.cohortMembership.findMany({ where: { studentId }, select: { cohortId: true } });
  const lesson = await tx.lesson.findFirst({ where: { id: sourceLessonId, OR: [{ studentId }, { cohortId: { in: memberships.map(({ cohortId }) => cohortId) } }] }, select: { cohortId: true } });
  if (!lesson) throw new Error("Этот урок не относится к ученику");
  return { sourceLessonId, cohortId: lesson.cohortId };
}

async function addAttachment(tx: Prisma.TransactionClient, data: FormData, target: { learningRecordId?: string; testResultId?: string }) {
  const file = data.get("attachment");
  if (!(file instanceof File) || !file.size) return;
  const stored = await storeLearningAttachment(file);
  if (stored) await tx.attachment.create({ data: { ...stored, ...target } });
}

export async function createLearningProfileEntry(studentId: string, data: FormData) {
  const type = required(data, "recordType") as LearningEntryType;
  if (!["VOCABULARY", "GRAMMAR_FUNCTION", "NOTE", "TEST"].includes(type)) throw new Error("Некорректный тип записи");
  await prisma.$transaction(async (tx) => {
    const relation = await relations(tx, studentId, data);
    if (type === "TEST") {
      const score = numberOrNull(data.get("score")), maxScore = numberOrNull(data.get("maxScore"));
      const record = await tx.testResult.create({ data: { studentId, title: required(data, "title"), testDate: dateOnly(required(data, "entryDate")), score, maxScore, percentage: testPercentage(score, maxScore), comment: optional(data, "note"), ...relation } });
      await addAttachment(tx, data, { testResultId: record.id }); return;
    }
    const content = optional(data, "content"), note = optional(data, "note");
    if (!content && !note) throw new Error("Добавьте содержание или заметку");
    const record = await tx.learningRecord.create({ data: { studentId, kind: type as LearningRecordKind, entryDate: dateOnly(required(data, "entryDate")), title: optional(data, "title") ?? (type === "NOTE" ? "Наблюдение" : "Материал"), content, note, ...relation } });
    await addAttachment(tx, data, { learningRecordId: record.id });
  });
  refresh(studentId); redirect(`/students/${studentId}/learning?type=${type}`);
}

export async function updateLearningProfileEntry(studentId: string, type: LearningEntryType, recordId: string, data: FormData) {
  await prisma.$transaction(async (tx) => {
    if (type === "TEST") {
      const existing = await tx.testResult.findFirstOrThrow({ where: { id: recordId, studentId } });
      const relation = await relations(tx, studentId, data, existing.cohortId);
      const score = numberOrNull(data.get("score")), maxScore = numberOrNull(data.get("maxScore"));
      await tx.testResult.update({ where: { id: recordId }, data: { title: required(data, "title"), testDate: dateOnly(required(data, "entryDate")), score, maxScore, percentage: testPercentage(score, maxScore), comment: optional(data, "note"), ...relation } });
      await addAttachment(tx, data, { testResultId: recordId }); return;
    }
    const existing = await tx.learningRecord.findFirstOrThrow({ where: { id: recordId, studentId } });
    const relation = await relations(tx, studentId, data, existing.cohortId);
    const content = optional(data, "content"), note = optional(data, "note");
    if (!content && !note) throw new Error("Добавьте содержание или заметку");
    await tx.learningRecord.update({ where: { id: recordId }, data: { title: optional(data, "title") ?? (type === "NOTE" ? "Наблюдение" : "Материал"), entryDate: dateOnly(required(data, "entryDate")), content, note, ...relation } });
    await addAttachment(tx, data, { learningRecordId: recordId });
  });
  refresh(studentId); redirect(`/students/${studentId}/learning?type=${type}`);
}

export async function deleteLearningProfileEntry(studentId: string, type: LearningEntryType, recordId: string) {
  await prisma.$transaction(async (tx) => {
    if (type === "TEST") { await tx.testResult.findFirstOrThrow({ where: { id: recordId, studentId } }); await tx.attachment.deleteMany({ where: { testResultId: recordId } }); await tx.testResult.delete({ where: { id: recordId } }); }
    else { await tx.learningRecord.findFirstOrThrow({ where: { id: recordId, studentId } }); await tx.attachment.deleteMany({ where: { learningRecordId: recordId } }); await tx.learningRecord.delete({ where: { id: recordId } }); }
  });
  refresh(studentId); redirect(`/students/${studentId}/learning?type=${type}`);
}
