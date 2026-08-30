"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { SETTINGS_ID, validTimezone } from "@/lib/settings";
import { removeTeacherAvatar, storeTeacherAvatar } from "@/lib/storage/teacher-avatar-storage";

const fail = (reason: string): never => redirect(`/settings?error=${reason}`);

export async function saveTeacherSettings(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const defaultLessonDuration = Number(formData.get("defaultLessonDuration"));
  const avatar = formData.get("avatar");

  if (!displayName || displayName.length > 80) fail("name");
  if (!validTimezone(timezone)) fail("timezone");
  if (!Number.isInteger(defaultLessonDuration) || defaultLessonDuration < 15 || defaultLessonDuration > 240) fail("duration");

  const existing = await prisma.teacherSettings.findUnique({ where: { id: SETTINGS_ID }, select: { avatarUrl: true } });
  let uploadedAvatarUrl: string | null = null;
  try {
    uploadedAvatarUrl = avatar instanceof File ? await storeTeacherAvatar(avatar) : null;
  } catch (error) {
    if ((error as Error).message === "AVATAR_TOO_LARGE") fail("avatar-size");
    if ((error as Error).message === "AVATAR_TYPE") fail("avatar-type");
    throw error;
  }

  try {
    await prisma.teacherSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { displayName, timezone, defaultLessonDuration, currency: "RUB", ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}) },
      create: { id: SETTINGS_ID, displayName, timezone, defaultLessonDuration, currency: "RUB", avatarUrl: uploadedAvatarUrl },
    });
  } catch (error) {
    await removeTeacherAvatar(uploadedAvatarUrl);
    throw error;
  }
  if (uploadedAvatarUrl) await removeTeacherAvatar(existing?.avatarUrl);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
