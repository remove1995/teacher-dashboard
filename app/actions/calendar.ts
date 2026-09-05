"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { dateOnly, timeToMinute, todayDate } from "@/lib/domain/dates";
import { sourceOccurrenceDate } from "@/lib/domain/schedule";
import { cancelOccurrenceRecord, removeOccurrence, rescheduleOccurrence, ScheduleDomainError } from "@/lib/services/schedule-service";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};
const duration = (formData: FormData) => { const value=Number(required(formData,"durationMinutes")); if(!Number.isInteger(value)||value<15||value>480)throw new Error("Некорректная длительность"); return value; };
const refresh = () => { revalidatePath("/calendar"); revalidatePath("/lessons"); revalidatePath("/attendance"); };
const expected = (error: unknown) => error instanceof ScheduleDomainError ? { error: error.message } : null;

export async function updateCalendarOccurrence(lessonId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const nextDate = required(formData, "date");
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { recurringSchedule: { select: { timezone: true } } } });
  const today = todayDate(lesson.recurringSchedule?.timezone);
  if (lesson.scheduledDate.toISOString().slice(0,10) < today || nextDate < today) return { error: "Прошедшее занятие нельзя изменить этим действием. Используйте перенос с сохранением истории." };
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
  return EMPTY_ACTION_STATE;
}

export async function rescheduleCalendarLesson(lessonId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await prisma.$transaction((tx) => rescheduleOccurrence(tx, lessonId, { date: required(formData,"date"), startMinute: timeToMinute(required(formData,"startTime")), durationMinutes: duration(formData) }));
  } catch (error) {
    const result = expected(error); if (result) return result; throw error;
  }
  refresh();
  return EMPTY_ACTION_STATE;
}

export async function cancelCalendarLesson(lessonId: string, _state: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await prisma.$transaction((tx) => cancelOccurrenceRecord(tx,lessonId));
  } catch (error) {
    const result = expected(error); if (result) return result; throw error;
  }
  refresh();
  return EMPTY_ACTION_STATE;
}

export async function removeCalendarOccurrence(lessonId: string, returnTo: string, _state: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await prisma.$transaction((tx) => removeOccurrence(tx, lessonId));
  } catch (error) {
    const result = expected(error); if (result) return result; throw error;
  }
  refresh();
  redirect(returnTo.startsWith("?") ? `/calendar${returnTo}` : "/calendar");
}

export async function createCalendarLesson(formData: FormData) {
  const target = required(formData,"target");
  const [targetType,targetId]=target.split(":");
  if((targetType!=="student"&&targetType!=="cohort")||!targetId)throw new Error("Выберите ученика или группу");
  const scheduledDate=dateOnly(required(formData,"date"));
  const attendanceStudentIds=targetType==="student"?[targetId]:(await prisma.cohortMembership.findMany({where:{cohortId:targetId,activeFrom:{lte:scheduledDate},AND:[{OR:[{activeTo:null},{activeTo:{gte:scheduledDate}}]},{OR:[{status:"REGULAR",OR:[{regularFrom:null},{regularFrom:{lte:scheduledDate}}]},{trialLessonDate:scheduledDate}]}]},select:{studentId:true}})).map(({studentId})=>studentId);
  await prisma.lesson.create({data:{studentId:targetType==="student"?targetId:null,cohortId:targetType==="cohort"?targetId:null,scheduledDate,startMinute:timeToMinute(required(formData,"startTime")),durationMinutes:duration(formData),title:String(formData.get("title")??"").trim()||"Новый урок",manuallyEdited:true,kanbanVisible:true,kanbanMaterializedAt:new Date(),attendance:{create:attendanceStudentIds.map((studentId)=>({studentId,status:"PLANNED"}))}}});
  refresh();
}
