"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { timeToMinute } from "@/lib/domain/dates";
import { createSchedule, replaceFutureSchedule, rescheduleOccurrence, ScheduleDomainError } from "@/lib/services/schedule-service";
import type { ActionState } from "@/lib/action-state";


const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new ScheduleDomainError("Заполните обязательные поля расписания.");
  return value;
};

function scheduleFields(formData: FormData) {
  const weekdays = formData.getAll("weekdays").map(Number);
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new ScheduleDomainError("Выберите хотя бы один день недели.");
  const slots = weekdays.map((weekday) => {
    const startMinute = timeToMinute(required(formData, `startTime:${weekday}`));
    const durationMinutes = Number(required(formData, `durationMinutes:${weekday}`));
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) throw new ScheduleDomainError("Укажите корректную длительность занятия.");
    return { weekday, startMinute, durationMinutes };
  });
  return { effectiveFrom: required(formData, "effectiveFrom"), effectiveTo: required(formData, "effectiveTo"), timezone: required(formData, "timezone"), slots };
}

export async function createRecurringSchedule(_state: ActionState, formData: FormData): Promise<ActionState> {
  let result;
  try {
    const targetType = required(formData, "targetType");
    const targetId = required(formData, "targetId");
    const fields = scheduleFields(formData);
    result = await prisma.$transaction((tx) => createSchedule(tx, targetType === "student" ? { studentId: targetId, ...fields } : { cohortId: targetId, ...fields }));
  } catch (error) {
    if (error instanceof ScheduleDomainError) return { error: error.message };
    throw error;
  }
  revalidatePath("/students");
  revalidatePath("/calendar");
  redirect(`/schedules/${result.schedule.id}`);
}

export async function updateRecurringSchedule(scheduleId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  let result;
  try {
    const fields = scheduleFields(formData);
    result = await prisma.$transaction((tx) => replaceFutureSchedule(tx, scheduleId, fields.effectiveFrom, fields));
  } catch (error) {
    if (error instanceof ScheduleDomainError) return { error: error.message };
    throw error;
  }
  revalidatePath("/students");
  revalidatePath("/calendar");
  redirect(`/schedules/${result.schedule.id}`);
}

export async function updateOnlyOccurrence(lessonId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  let lesson;
  try {
    const replacement = { date: required(formData, "date"), startMinute: timeToMinute(required(formData, "startTime")), durationMinutes: Number(required(formData, "durationMinutes")) };
    if (!Number.isInteger(replacement.durationMinutes) || replacement.durationMinutes <= 0) throw new ScheduleDomainError("Укажите корректную длительность занятия.");
    lesson = await prisma.$transaction((tx) => rescheduleOccurrence(tx, lessonId, replacement));
  } catch (error) {
    if (error instanceof ScheduleDomainError) return { error: error.message };
    throw error;
  }
  revalidatePath("/calendar");
  redirect(`/schedules/${lesson.recurringScheduleId}`);
}
