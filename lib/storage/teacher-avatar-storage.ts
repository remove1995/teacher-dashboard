import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const TEACHER_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function validateTeacherAvatar(file: Pick<File, "size" | "type">) {
  if (!file.size) return;
  if (file.size > TEACHER_AVATAR_MAX_BYTES) throw new Error("AVATAR_TOO_LARGE");
  if (!extensions[file.type]) throw new Error("AVATAR_TYPE");
}

export async function storeTeacherAvatar(file: File) {
  if (!file.size) return null;
  validateTeacherAvatar(file);
  const storedName = `avatar-${randomUUID()}${extensions[file.type]}`;
  const directory = path.join(process.cwd(), "public", "uploads", "profile");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/profile/${storedName}`;
}

export async function removeTeacherAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith("/uploads/profile/avatar-")) return;
  const storedName = path.basename(avatarUrl);
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", "profile", storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
