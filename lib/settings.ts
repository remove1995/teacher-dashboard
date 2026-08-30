import { cache } from "react";
import { prisma } from "./db/prisma";

export const SETTINGS_ID = "primary";
export const DEFAULT_TEACHER_SETTINGS = {
  id: SETTINGS_ID,
  displayName: "Маша",
  avatarUrl: null,
  timezone: "Europe/Moscow",
  defaultLessonDuration: 60,
  currency: "RUB",
} as const;

export const getTeacherSettings = cache(async () => {
  const settings = await prisma.teacherSettings.findUnique({ where: { id: SETTINGS_ID } });
  return settings ?? DEFAULT_TEACHER_SETTINGS;
});

export function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
