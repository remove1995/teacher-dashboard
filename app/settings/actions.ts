"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { SETTINGS_ID, validTimezone } from "@/lib/settings";

const fail = (reason: string): never => redirect(`/settings?error=${reason}`);

export async function saveTeacherSettings(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const defaultLessonDuration = Number(formData.get("defaultLessonDuration"));

  if (!displayName || displayName.length > 80) fail("name");
  if (!validTimezone(timezone)) fail("timezone");
  if (!Number.isInteger(defaultLessonDuration) || defaultLessonDuration < 15 || defaultLessonDuration > 240) fail("duration");

  await prisma.teacherSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { displayName, timezone, defaultLessonDuration, currency: "RUB" },
    create: { id: SETTINGS_ID, displayName, timezone, defaultLessonDuration, currency: "RUB" },
  });
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
