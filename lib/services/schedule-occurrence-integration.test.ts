import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cancelOccurrenceRecord, createSchedule, generateLessonsForSchedule, removeOccurrence, replaceFutureSchedule, rescheduleOccurrence, ScheduleDomainError } from "./schedule-service";
import { permanentlyDeleteStudentRecord } from "./student-lifecycle-service";

const prisma = new PrismaClient();
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const future = "2099-09-10";

async function fixture(lessonDate: string, status: "PLANNED" | "COMPLETED" | "CANCELLED" = "PLANNED") {
  const student = await prisma.student.create({ data: { name: `Occurrence ${crypto.randomUUID()}`, color: "#83916f" } });
  const lesson = await prisma.lesson.create({ data: { studentId: student.id, scheduledDate: date(lessonDate), startMinute: 960, durationMinutes: 60, title: `Урок · ${student.name}`, status, completedAt: status === "COMPLETED" ? new Date() : null, attendance: { create: { studentId: student.id, status: status === "COMPLETED" ? "PRESENT" : status === "CANCELLED" ? "CANCELLED" : "PLANNED", manuallyEdited: status !== "PLANNED" } } } });
  return { student, lesson };
}

afterAll(() => prisma.$disconnect());

describe("calendar occurrence persistence", () => {
  it.each([["future", "2099-09-01"], ["past", "2020-01-01"]])("removes a %s empty PLANNED occurrence completely", async (_label, lessonDate) => {
    const { student, lesson } = await fixture(lessonDate);
    try {
      await prisma.$transaction((tx) => removeOccurrence(tx,lesson.id));
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id } })).toBeNull();
      expect(await prisma.attendance.count({ where: { lessonId: lesson.id } })).toBe(0);
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("does not remove an occurrence with real history", async () => {
    const { student, lesson } = await fixture("2020-01-01");
    try {
      await prisma.attendance.updateMany({ where: { lessonId: lesson.id }, data: { status: "ABSENT", manuallyEdited: true } });
      await expect(prisma.$transaction((tx) => removeOccurrence(tx,lesson.id))).rejects.toThrow("связанные данные");
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id } })).not.toBeNull();
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("does not recreate a removed recurring occurrence", async () => {
    const student = await prisma.student.create({ data: { name: `Removed series ${crypto.randomUUID()}`, color: "#83916f" } });
    try {
      const created = await prisma.$transaction((tx) => createSchedule(tx,{ studentId: student.id, effectiveFrom: "2099-09-01", effectiveTo: "2099-09-15", timezone: "Europe/Moscow", slots: [{ weekday: 1, startMinute: 960, durationMinutes: 60 }] }));
      const occurrence = await prisma.lesson.findFirstOrThrow({ where: { recurringScheduleId: created.schedule.id }, orderBy: { scheduledDate: "asc" } });
      await prisma.$transaction((tx) => removeOccurrence(tx,occurrence.id));
      await generateLessonsForSchedule(prisma,created.schedule.id);
      expect(await prisma.lesson.findUnique({ where: { generationKey: occurrence.generationKey! } })).toBeNull();
      expect(await prisma.scheduleException.findFirst({ where: { scheduleId: created.schedule.id, kind: "BREAK" } })).not.toBeNull();
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("keeps a cancelled occurrence visible as CANCELLED", async () => {
    const { student, lesson } = await fixture("2020-01-01");
    try {
      await prisma.$transaction((tx) => cancelOccurrenceRecord(tx,lesson.id));
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id }, select: { status: true } })).toEqual({ status: "CANCELLED" });
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it.each([["future", "2099-09-01"], ["past empty", "2020-01-01"]])("reschedules a %s PLANNED occurrence to the future", async (_label, lessonDate) => {
    const { student, lesson } = await fixture(lessonDate);
    try {
      const replacement = await prisma.$transaction((tx) => rescheduleOccurrence(tx,lesson.id,{ date: future, startMinute: 1020, durationMinutes: 60 }));
      expect(replacement.originalLessonId).toBe(lesson.id);
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id }, select: { status: true } })).toEqual({ status: "RESCHEDULED" });
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("removes an empty replacement and its technical original without broken relations or duplicates", async () => {
    const student = await prisma.student.create({ data: { name: `Replacement ${crypto.randomUUID()}`, color: "#83916f" } });
    try {
      const created=await prisma.$transaction((tx)=>createSchedule(tx,{studentId:student.id,effectiveFrom:"2099-09-01",effectiveTo:"2099-09-15",timezone:"Europe/Moscow",slots:[{weekday:1,startMinute:960,durationMinutes:60}]}));
      const original=await prisma.lesson.findFirstOrThrow({where:{recurringScheduleId:created.schedule.id},orderBy:{scheduledDate:"asc"}});
      const replacement=await prisma.$transaction((tx)=>rescheduleOccurrence(tx,original.id,{date:"2099-09-12",startMinute:1020,durationMinutes:60}));
      const result=await prisma.$transaction((tx)=>removeOccurrence(tx,replacement.id));
      expect(new Set(result.removedIds)).toEqual(new Set([original.id,replacement.id]));
      expect(await prisma.lesson.count({where:{id:{in:[original.id,replacement.id]}}})).toBe(0);
      expect(await prisma.lesson.count({where:{originalLessonId:original.id}})).toBe(0);
      expect(await prisma.scheduleException.count({where:{scheduleId:created.schedule.id,kind:"BREAK"}})).toBe(1);
      await generateLessonsForSchedule(prisma,created.schedule.id);
      expect(await prisma.lesson.count({where:{generationKey:original.generationKey}})).toBe(0);
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("does not remove a replacement when it has real lesson or credit history", async () => {
    const { student, lesson: original }=await fixture("2099-09-01");
    try {
      const replacement=await prisma.$transaction((tx)=>rescheduleOccurrence(tx,original.id,{date:"2099-09-12",startMinute:1020,durationMinutes:60}));
      await prisma.lesson.update({where:{id:replacement.id},data:{homeworkText:"Реальное домашнее задание"}});
      await prisma.credit.create({data:{studentId:student.id,sourceLessonId:replacement.id,amountMinor:1000,confirmedAt:new Date()}});
      await expect(prisma.$transaction((tx)=>removeOccurrence(tx,replacement.id))).rejects.toThrow("связанные данные");
      expect(await prisma.lesson.count({where:{id:{in:[original.id,replacement.id]}}})).toBe(2);
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it.each(["COMPLETED", "CANCELLED"] as const)("does not rewrite a past %s historical lesson", async (status) => {
    const { student, lesson } = await fixture("2020-01-01",status);
    try {
      await expect(prisma.$transaction((tx) => rescheduleOccurrence(tx,lesson.id,{ date: future, startMinute: 1020, durationMinutes: 60 }))).rejects.toBeInstanceOf(ScheduleDomainError);
      expect(await prisma.lesson.findUnique({ where: { id: lesson.id }, select: { status: true } })).toEqual({ status });
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });

  it("moves a not-yet-started schedule start date, removes obsolete empty occurrences, preserves history, and creates no duplicates", async () => {
    const student = await prisma.student.create({ data: { name: `Schedule ${crypto.randomUUID()}`, color: "#83916f" } });
    try {
      const created = await prisma.$transaction((tx) => createSchedule(tx,{ studentId: student.id, effectiveFrom: "2099-09-01", effectiveTo: "2099-09-30", timezone: "Europe/Moscow", slots: [{ weekday: 1, startMinute: 960, durationMinutes: 60 }] }));
      const oldLessons = await prisma.lesson.findMany({ where: { recurringScheduleId: created.schedule.id }, orderBy: { scheduledDate: "asc" } });
      expect(oldLessons.length).toBeGreaterThan(1);
      const history = oldLessons[0];
      const manual = oldLessons[1];
      await prisma.lesson.update({ where: { id: history.id }, data: { homeworkText: "Исторические данные" } });
      await prisma.lesson.update({ where: { id: manual.id }, data: { manuallyEdited: true, kanbanVisible: true } });
      const result = await prisma.$transaction((tx) => replaceFutureSchedule(tx,created.schedule.id,"2099-09-15",{ effectiveFrom: "2099-09-15", effectiveTo: "2099-09-30", timezone: "Europe/Moscow", slots: [{ weekday: 1, startMinute: 960, durationMinutes: 60 }] }));
      expect(await prisma.lesson.findUnique({ where: { id: history.id } })).not.toBeNull();
      expect(await prisma.lesson.findUnique({ where: { id: manual.id } })).not.toBeNull();
      expect(await prisma.lesson.count({ where: { recurringScheduleId: created.schedule.id, id: { notIn: [history.id,manual.id] } } })).toBe(0);
      await generateLessonsForSchedule(prisma,result.schedule.id);
      const generated = await prisma.lesson.findMany({ where: { recurringScheduleId: result.schedule.id }, select: { generationKey: true, scheduledDate: true } });
      expect(generated.every(({ scheduledDate }) => scheduledDate >= date("2099-09-15"))).toBe(true);
      expect(new Set(generated.map(({ generationKey }) => generationKey)).size).toBe(generated.length);
    } finally { await permanentlyDeleteStudentRecord(prisma,student.id); }
  });
});
