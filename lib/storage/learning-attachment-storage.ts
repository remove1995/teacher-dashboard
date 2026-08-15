import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"]);
const maximumBytes = 15 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "application/pdf": ".pdf", "application/msword": ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx", "application/vnd.ms-excel": ".xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx", "text/plain": ".txt" };

export async function storeLearningAttachment(file: File) {
  if (!file.size) return null;
  if (file.size > maximumBytes) throw new Error("Файл должен быть не больше 15 МБ");
  if (!allowedTypes.has(file.type)) throw new Error("Этот тип файла не поддерживается");
  const extension = extensions[file.type];
  const storedName = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "learning");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedName), Buffer.from(await file.arrayBuffer()));
  return { fileName: file.name, mediaType: file.type, externalUrl: `/uploads/learning/${storedName}`, sizeBytes: file.size };
}
