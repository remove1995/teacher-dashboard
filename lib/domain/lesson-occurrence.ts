export const OCCURRENCE_HAS_HISTORY = "У урока уже есть связанные данные. Его можно отменить, но нельзя удалить.";

export type LessonOccurrenceSnapshot = {
  status: string;
  completedAt?: Date | null;
  title?: string | null;
  defaultTitle?: string | null;
  goal?: string | null;
  homeworkText?: string | null;
  notes?: string | null;
  colorOverride?: string | null;
  originalLessonId?: string | null;
  replacementLesson?: unknown | null;
  stages?: readonly unknown[];
  tags?: readonly unknown[];
  attachments?: readonly unknown[];
  credits?: readonly unknown[];
  learningRecords?: readonly unknown[];
  testResults?: readonly unknown[];
  attendance?: readonly { status: string; note?: string | null; manuallyEdited?: boolean }[];
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export function realLessonHistoryReasons(lesson: LessonOccurrenceSnapshot) {
  const reasons: string[] = [];
  if (lesson.status === "COMPLETED" || lesson.status === "CANCELLED" || lesson.completedAt) reasons.push("status");
  if (hasText(lesson.title) && lesson.title !== lesson.defaultTitle && lesson.title !== "Новый урок") reasons.push("title");
  if (hasText(lesson.goal) || hasText(lesson.homeworkText) || hasText(lesson.notes) || hasText(lesson.colorOverride)) reasons.push("plan");
  if (lesson.stages?.length || lesson.tags?.length || lesson.attachments?.length) reasons.push("plan-relations");
  if (lesson.credits?.length || lesson.learningRecords?.length || lesson.testResults?.length) reasons.push("history-relations");
  if (lesson.attendance?.some((entry) => entry.manuallyEdited || !["PLANNED","RESCHEDULED"].includes(entry.status) || hasText(entry.note))) reasons.push("attendance");
  return reasons;
}

export function emptyOccurrenceReasons(lesson: LessonOccurrenceSnapshot) {
  const reasons=realLessonHistoryReasons(lesson);
  if (lesson.status !== "PLANNED") reasons.push("status");
  return reasons;
}

export function hasRealLessonHistory(lesson: LessonOccurrenceSnapshot) {
  return realLessonHistoryReasons(lesson).length > 0;
}

export function isEmptyPlannedOccurrence(lesson: LessonOccurrenceSnapshot) {
  return emptyOccurrenceReasons(lesson).length === 0;
}

export function canRescheduleOccurrence(lesson: LessonOccurrenceSnapshot, _isPast: boolean) {
  if (lesson.status !== "PLANNED") return false;
  return true;
}
