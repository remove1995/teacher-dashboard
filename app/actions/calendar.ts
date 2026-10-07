"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { dateOnly, timeToMinute } from "@/lib/domain/dates";
import { cancelOccurrenceRecord, removeOccurrence, rescheduleOccurrence, ScheduleDomainError, updateOccurrenceSchedule } from "@/lib/services/schedule-service";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};
const duration = (formData: FormData) => { const value=Number(required(formData,"durationMinutes")); if(!Number.isInteger(value)||value<15||value>480)throw new Error("Некорректная длительность"); return value; };
const refresh = () => { revalidatePath("/calendar"); revalidatePath("/lessons"); revalidatePath("/attendance"); revalidatePath("/payments"); revalidatePath("/students", "layout"); };
const expected = (error: unknown) => error instanceof ScheduleDomainError ? { error: error.message } : null;

export async function updateCalendarOccurrence(lessonId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const nextDate = required(formData, "date");
  const startMinute = timeToMinute(required(formData, "startTime"));
  const durationMinutes = duration(formData);
  await prisma.$transaction((tx) => updateOccurrenceSchedule(tx, lessonId, { date: nextDate, startMinute, durationMinutes }));
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
