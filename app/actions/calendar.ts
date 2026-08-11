"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { dateOnly, timeToMinute, todayDate } from "@/lib/domain/dates";
import { sourceOccurrenceDate } from "@/lib/domain/schedule";
import { rescheduleOccurrence } from "@/lib/services/schedule-service";

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};
const duration = (formData: FormData) => { const value=Number(required(formData,"durationMinutes")); if(!Number.isInteger(value)||value<15||value>480)throw new Error("Некорректная длительность"); return value; };
const refresh = () => { revalidatePath("/calendar"); revalidatePath("/lessons"); revalidatePath("/attendance"); };

export async function updateCalendarOccurrence(lessonId: string, formData: FormData) {
  const nextDate = required(formData, "date");
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { recurringSchedule: { select: { timezone: true } } } });
  const today = todayDate(lesson.recurringSchedule?.timezone);
  if (lesson.scheduledDate.toISOString().slice(0,10) < today || nextDate < today) throw new Error("Прошедшие занятия нельзя переносить");
  const startMinute = timeToMinute(required(formData, "startTime"));
  const durationMinutes = duration(formData);
  await prisma.$transaction(async (tx) => {
    if (lesson.recurringScheduleId) {
      const sourceDate = sourceOccurrenceDate(lesson.generationKey) ?? lesson.scheduledDate.toISOString().slice(0,10);
      await tx.scheduleException.deleteMany({ where: { scheduleId: lesson.recurringScheduleId!, occurrenceDate: dateOnly(sourceDate) } });
      await tx.scheduleException.create({ data: { scheduleId: lesson.recurringScheduleId!, occurrenceDate: dateOnly(sourceDate), kind: "OCCURRENCE_OVERRIDE", replacementDate: dateOnly(nextDate), replacementStartMinute: startMinute, replacementDurationMinutes: durationMinutes } });
    }
    await tx.lesson.update({ where: { id: lessonId }, data: { scheduledDate: dateOnly(nextDate), startMinute, durationMinutes, manuallyEdited: true } });
  });
  refresh();
}

export async function rescheduleCalendarLesson(lessonId: string, formData: FormData) {
  await prisma.$transaction((tx) => rescheduleOccurrence(tx, lessonId, { date: required(formData,"date"), startMinute: timeToMinute(required(formData,"startTime")), durationMinutes: duration(formData) }));
  refresh();
}

export async function cancelCalendarLesson(lessonId: string) {
  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    if (lesson.status !== "PLANNED") throw new Error("Отменить можно только запланированное занятие");
    if (lesson.scheduledDate.toISOString().slice(0,10) < todayDate("Europe/Moscow")) throw new Error("Прошедшие занятия нельзя отменять через календарь");
    await tx.lesson.update({ where: { id: lessonId }, data: { status: "CANCELLED", manuallyEdited: true } });
    await tx.attendance.updateMany({ where: { lessonId, manuallyEdited: false }, data: { status: "CANCELLED" } });
    if (lesson.recurringScheduleId) {
      const sourceDate=sourceOccurrenceDate(lesson.generationKey)??lesson.scheduledDate.toISOString().slice(0,10);
      await tx.scheduleException.deleteMany({where:{scheduleId:lesson.recurringScheduleId,occurrenceDate:dateOnly(sourceDate)}});
      await tx.scheduleException.create({data:{scheduleId:lesson.recurringScheduleId,occurrenceDate:dateOnly(sourceDate),kind:"CANCEL"}});
    }
  });
  refresh();
}

export async function createCalendarLesson(formData: FormData) {
  const target = required(formData,"target");
  const [targetType,targetId]=target.split(":");
  if((targetType!=="student"&&targetType!=="cohort")||!targetId)throw new Error("Выберите ученика или группу");
  const scheduledDate=dateOnly(required(formData,"date"));
  const attendanceStudentIds=targetType==="student"?[targetId]:(await prisma.cohortMembership.findMany({where:{cohortId:targetId,activeFrom:{lte:scheduledDate},OR:[{activeTo:null},{activeTo:{gte:scheduledDate}}]},select:{studentId:true}})).map(({studentId})=>studentId);
  await prisma.lesson.create({data:{studentId:targetType==="student"?targetId:null,cohortId:targetType==="cohort"?targetId:null,scheduledDate,startMinute:timeToMinute(required(formData,"startTime")),durationMinutes:duration(formData),title:String(formData.get("title")??"").trim()||"Новый урок",manuallyEdited:true,kanbanVisible:true,kanbanMaterializedAt:new Date(),attendance:{create:attendanceStudentIds.map((studentId)=>({studentId,status:"PLANNED"}))}}});
  refresh();
}
