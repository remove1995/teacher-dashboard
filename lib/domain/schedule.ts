export type WeeklySlot = { weekday: number; startMinute: number; durationMinutes: number };
export type ScheduleException = { occurrenceDate: string; kind: "CANCEL" | "BREAK" | "OCCURRENCE_OVERRIDE"; replacementDate?: string; replacementStartMinute?: number; replacementDurationMinutes?: number };
export type GeneratedOccurrence = { date: string; startMinute: number; durationMinutes: number; replacesDate?: string };

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function generateOccurrences(input: { effectiveFrom: string; effectiveTo: string; slots: WeeklySlot[]; exceptions?: ScheduleException[] }) {
  const start = new Date(`${input.effectiveFrom}T00:00:00.000Z`);
  const end = new Date(`${input.effectiveTo}T00:00:00.000Z`);
  if (end < start) throw new Error("effectiveTo must not be before effectiveFrom");
  input.slots.forEach((slot) => {
    if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6) throw new Error("weekday must be between 0 and 6");
    if (!Number.isInteger(slot.startMinute) || slot.startMinute < 0 || slot.startMinute > 1439) throw new Error("startMinute must be between 0 and 1439");
    if (!Number.isInteger(slot.durationMinutes) || slot.durationMinutes <= 0) throw new Error("durationMinutes must be positive");
  });
  const exceptions = new Map((input.exceptions ?? []).map((exception) => [exception.occurrenceDate, exception]));
  const occurrences: GeneratedOccurrence[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const occurrenceDate = iso(cursor);
    for (const slot of input.slots.filter((candidate) => candidate.weekday === cursor.getUTCDay())) {
      const exception = exceptions.get(occurrenceDate);
      if (exception?.kind === "CANCEL" || exception?.kind === "BREAK") continue;
      if (exception?.kind === "OCCURRENCE_OVERRIDE") {
        if (!exception.replacementDate || exception.replacementStartMinute === undefined) throw new Error("occurrence override requires replacement date and time");
        occurrences.push({ date: exception.replacementDate, startMinute: exception.replacementStartMinute, durationMinutes: exception.replacementDurationMinutes ?? slot.durationMinutes, replacesDate: occurrenceDate });
      } else {
        occurrences.push({ date: occurrenceDate, startMinute: slot.startMinute, durationMinutes: slot.durationMinutes });
      }
    }
  }
  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);
}

export function partitionScheduleUpdate<T extends { scheduledDate: Date; manuallyEdited: boolean; kanbanVisible?: boolean; status?: string }>(lessons: T[], today: Date) {
  return lessons.reduce<{ preserved: T[]; replaceable: T[] }>((result, lesson) => {
    (lesson.scheduledDate < today || lesson.manuallyEdited || lesson.kanbanVisible || (lesson.status !== undefined && lesson.status !== "PLANNED") ? result.preserved : result.replaceable).push(lesson);
    return result;
  }, { preserved: [], replaceable: [] });
}

export function sourceOccurrenceDate(generationKey: string | null | undefined) {
  if (!generationKey) return null;
  const parts = generationKey.split(":");
  return parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : null;
}

export function nextScheduleRevision(currentRevision: number) {
  if (!Number.isSafeInteger(currentRevision) || currentRevision < 1) throw new Error("currentRevision must be a positive integer");
  return currentRevision + 1;
}
