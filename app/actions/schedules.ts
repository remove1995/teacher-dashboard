"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { timeToMinute } from "@/lib/domain/dates";
import { createSchedule, replaceFutureSchedule, rescheduleOccurrence } from "@/lib/services/schedule-service";

const required = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};

function scheduleFields(formData: FormData) {
  const weekdays = formData.getAll("weekdays").map(Number);
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Choose at least one weekday");
  const slots = weekdays.map((weekday) => {
    const startMinute = timeToMinute(required(formData, `startTime:${weekday}`));
    const durationMinutes = Number(required(formData, `durationMinutes:${weekday}`));
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) throw new Error("Duration must be a positive number of minutes");
    return { weekday, startMinute, durationMinutes };
  });
  return { effectiveFrom: required(formData, "effectiveFrom"), effectiveTo: required(formData, "effectiveTo"), timezone: required(formData, "timezone"), slots };
}

export async function createRecurringSchedule(formData: FormData) {
  const targetType = required(formData, "targetType");
  const targetId = required(formData, "targetId");
  const fields = scheduleFields(formData);
  const result = await prisma.$transaction((tx) => createSchedule(tx, targetType === "student" ? { studentId: targetId, ...fields } : { cohortId: targetId, ...fields }));
  revalidatePath("/students");
  revalidatePath("/calendar");
  redirect(`/schedules/${result.schedule.id}`);
}

export async function updateRecurringSchedule(scheduleId: string, formData: FormData) {
  const fields = scheduleFields(formData);
  const changeFrom = required(formData, "changeFrom");
  const result = await prisma.$transaction((tx) => replaceFutureSchedule(tx, scheduleId, changeFrom, fields));
  revalidatePath("/students");
  revalidatePath("/calendar");
  redirect(`/schedules/${result.schedule.id}`);
}

export async function updateOnlyOccurrence(lessonId: string, formData: FormData) {
  const replacement = { date: required(formData, "date"), startMinute: timeToMinute(required(formData, "startTime")), durationMinutes: Number(required(formData, "durationMinutes")) };
  if (!Number.isInteger(replacement.durationMinutes) || replacement.durationMinutes <= 0) throw new Error("Invalid duration");
  const lesson = await prisma.$transaction((tx) => rescheduleOccurrence(tx, lessonId, replacement));
  revalidatePath("/calendar");
  redirect(`/schedules/${lesson.recurringScheduleId}`);
}
