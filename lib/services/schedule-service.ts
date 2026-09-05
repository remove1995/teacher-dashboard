import type { Prisma, PrismaClient } from "@prisma/client";
import { dateOnly, previousDate, todayDate, toDateInput } from "../domain/dates";
import { generateOccurrences, nextScheduleRevision, sourceOccurrenceDate, type WeeklySlot } from "../domain/schedule";
import { defaultLessonDate } from "../domain/lesson";
import { canRescheduleOccurrence, hasRealLessonHistory, isEmptyPlannedOccurrence, OCCURRENCE_HAS_HISTORY } from "../domain/lesson-occurrence";

type Db = PrismaClient | Prisma.TransactionClient;

const occurrenceSafetyInclude = {
  student: { select: { name: true } },
  cohort: { select: { name: true } },
  attendance: { select: { status: true, note: true, manuallyEdited: true, studentId: true } },
  stages: { select: { id: true } }, tags: { select: { lessonId: true } }, attachments: { select: { id: true } },
  credits: { select: { id: true } }, learningRecords: { select: { id: true } }, testResults: { select: { id: true } },
  replacementLesson: { select: { id: true } }, recurringSchedule: { select: { timezone: true } },
} satisfies Prisma.LessonInclude;

function occurrenceSnapshot(lesson: Awaited<ReturnType<typeof findOccurrence>>) {
  const ownerName = lesson.student?.name ?? lesson.cohort?.name;
  return { ...lesson, defaultTitle: ownerName ? `Урок · ${ownerName}` : null };
}

async function findOccurrence(db: Db, lessonId: string) {
  return db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: occurrenceSafetyInclude });
}

export class ScheduleDomainError extends Error {
  constructor(message: string) { super(message); this.name = "ScheduleDomainError"; }
}

export type ScheduleTarget = { studentId: string; cohortId?: never } | { cohortId: string; studentId?: never };

type ScheduleDefinition = ScheduleTarget & {
  effectiveFrom: string;
  effectiveTo: string;
  timezone: string;
  slots: WeeklySlot[];
};

async function targetDetails(db: Db, target: ScheduleTarget, occurrenceDate: Date) {
  if (target.studentId) {
    const student = await db.student.findUniqueOrThrow({ where: { id: target.studentId }, select: { name: true } });
    return { title: `Урок · ${student.name}`, attendanceStudentIds: [target.studentId] };
  }
  const cohort = await db.cohort.findUniqueOrThrow({
    where: { id: target.cohortId },
    select: { name: true, memberships: { where: { activeFrom: { lte: occurrenceDate }, AND: [{ OR: [{ activeTo: null }, { activeTo: { gte: occurrenceDate } }] }, { OR: [{ status: "REGULAR", OR: [{ regularFrom: null }, { regularFrom: { lte: occurrenceDate } }] }, { trialLessonDate: occurrenceDate }] }] }, select: { studentId: true } } },
  });
  return { title: `Урок · ${cohort.name}`, attendanceStudentIds: cohort.memberships.map(({ studentId }) => studentId) };
}

async function generateLessons(db: Db, schedule: { id: string; revision: number; effectiveFrom: Date; effectiveTo: Date | null; studentId: string | null; cohortId: string | null; timezone: string; slots: WeeklySlot[]; exceptions?: Array<{ occurrenceDate: Date; kind: "CANCEL" | "BREAK" | "OCCURRENCE_OVERRIDE"; replacementDate: Date | null; replacementStartMinute: number | null; replacementDurationMinutes: number | null }> }, excludedSourceDates = new Set<string>()) {
  if (!schedule.effectiveTo) throw new Error("Phase 1 schedules require an effective end date");
  const start = [toDateInput(schedule.effectiveFrom), todayDate(schedule.timezone)].sort().at(-1)!;
  const end = toDateInput(schedule.effectiveTo);
  if (start > end) return 0;
  const target: ScheduleTarget = schedule.studentId ? { studentId: schedule.studentId } : { cohortId: schedule.cohortId! };
  const exceptions = schedule.exceptions?.map((exception) => ({ occurrenceDate: toDateInput(exception.occurrenceDate), kind: exception.kind, replacementDate: exception.replacementDate ? toDateInput(exception.replacementDate) : undefined, replacementStartMinute: exception.replacementStartMinute ?? undefined, replacementDurationMinutes: exception.replacementDurationMinutes ?? undefined }));
  const occurrences = generateOccurrences({ effectiveFrom: start, effectiveTo: end, slots: schedule.slots, exceptions }).filter(({ replacesDate, date }) => !excludedSourceDates.has(replacesDate ?? date));
  let generated = 0;
  for (const occurrence of occurrences) {
    const occurrenceDate = dateOnly(defaultLessonDate({ source: "recurring", generatedDate: occurrence.date }));
    const details = await targetDetails(db, target, occurrenceDate);
    const generationKey = `${schedule.id}:${occurrence.date}:${occurrence.startMinute}`;
    const existing = await db.lesson.findUnique({ where: { generationKey }, select: { id: true } });
    if (existing) continue;
    await db.lesson.create({
      data: {
        ...target,
        scheduledDate: occurrenceDate,
        startMinute: occurrence.startMinute,
        durationMinutes: occurrence.durationMinutes,
        title: details.title,
        recurringScheduleId: schedule.id,
        scheduleRevision: schedule.revision,
        generationKey,
        attendance: { create: details.attendanceStudentIds.map((studentId) => ({ studentId, status: "PLANNED" })) },
      },
    });
    generated += 1;
  }
  return generated;
}

export async function generateLessonsForSchedule(db: Db, scheduleId: string) {
  const schedule = await db.recurringSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { slots: true, exceptions: true } });
  return generateLessons(db, schedule);
}

export async function createSchedule(db: Db, definition: ScheduleDefinition) {
  if (definition.effectiveTo < definition.effectiveFrom) throw new ScheduleDomainError("Дата окончания не может быть раньше даты начала.");
  const schedule = await db.recurringSchedule.create({
    data: {
      studentId: definition.studentId ?? null,
      cohortId: definition.cohortId ?? null,
      effectiveFrom: dateOnly(definition.effectiveFrom),
      effectiveTo: dateOnly(definition.effectiveTo),
      timezone: definition.timezone,
      slots: { create: definition.slots },
    },
    include: { slots: true },
  });
  const generatedCount = await generateLessons(db, schedule);
  return { schedule, generatedCount };
}

export async function replaceFutureSchedule(db: Db, scheduleId: string, changeFrom: string, definition: Omit<ScheduleDefinition, keyof ScheduleTarget>) {
  const cutoff = dateOnly(changeFrom);
  const current = await db.recurringSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { slots: true, exceptions: true } });
  if (changeFrom < todayDate(current.timezone)) throw new ScheduleDomainError("Дата начала новой версии расписания не может быть в прошлом.");
  if (current.effectiveTo && cutoff > current.effectiveTo) throw new ScheduleDomainError("Дата начала должна входить в текущий период расписания.");
  if (definition.effectiveTo < changeFrom) throw new ScheduleDomainError("Дата окончания не может быть раньше даты начала.");

  const scheduleLessons = await db.lesson.findMany({ where: { recurringScheduleId: scheduleId }, include: occurrenceSafetyInclude });
  const preservedSourceDates = new Set(scheduleLessons.filter((lesson) => lesson.manuallyEdited || lesson.kanbanVisible || !isEmptyPlannedOccurrence(occurrenceSnapshot(lesson))).flatMap(({ generationKey }) => { const value = sourceOccurrenceDate(generationKey); return value ? [value] : []; }));
  for (const exception of current.exceptions) if (exception.kind === "BREAK" || exception.kind === "CANCEL") preservedSourceDates.add(toDateInput(exception.occurrenceDate));
  const replaceableIds = scheduleLessons.filter((lesson) => !lesson.manuallyEdited && !lesson.kanbanVisible && isEmptyPlannedOccurrence(occurrenceSnapshot(lesson))).map(({ id }) => id);
  if (replaceableIds.length) {
    await db.attendance.deleteMany({ where: { lessonId: { in: replaceableIds } } });
    await db.lesson.deleteMany({ where: { id: { in: replaceableIds }, status: "PLANNED", originalLessonId: null } });
  }
  const previousEnd = cutoff.getTime() === current.effectiveFrom.getTime() ? current.effectiveFrom : dateOnly(previousDate(changeFrom));
  await db.recurringSchedule.update({ where: { id: scheduleId }, data: { effectiveTo: previousEnd, status: "ENDED" } });
  const target: ScheduleTarget = current.studentId ? { studentId: current.studentId } : { cohortId: current.cohortId! };
  const next = await db.recurringSchedule.create({
    data: {
      ...target,
      effectiveFrom: cutoff,
      effectiveTo: dateOnly(definition.effectiveTo),
      timezone: definition.timezone,
      revision: nextScheduleRevision(current.revision),
      slots: { create: definition.slots },
    },
    include: { slots: true },
  });
  const generatedCount = await generateLessons(db, next, preservedSourceDates);
  return { schedule: next, generatedCount, preservedCount: scheduleLessons.length - replaceableIds.length };
}

export async function rescheduleOccurrence(db: Db, lessonId: string, replacement: { date: string; startMinute: number; durationMinutes: number }) {
  const lesson = await findOccurrence(db, lessonId);
  const today = todayDate(lesson.recurringSchedule?.timezone);
  const isPast = toDateInput(lesson.scheduledDate) < today;
  if (!canRescheduleOccurrence(occurrenceSnapshot(lesson), isPast)) throw new ScheduleDomainError(isPast ? "Прошедший урок с историей нельзя перенести." : "Перенести можно только запланированное занятие.");
  if (replacement.date < today) throw new ScheduleDomainError("Новое занятие нельзя переносить в прошлое.");
  const target: ScheduleTarget = lesson.studentId ? { studentId: lesson.studentId } : { cohortId: lesson.cohortId! };
  if (lesson.recurringScheduleId) {
    const sourceDate = sourceOccurrenceDate(lesson.generationKey) ?? toDateInput(lesson.scheduledDate);
    await db.scheduleException.deleteMany({ where: { scheduleId: lesson.recurringScheduleId, occurrenceDate: dateOnly(sourceDate) } });
    await db.scheduleException.create({ data: { scheduleId: lesson.recurringScheduleId, occurrenceDate: dateOnly(sourceDate), kind: "OCCURRENCE_OVERRIDE", replacementDate: dateOnly(replacement.date), replacementStartMinute: replacement.startMinute, replacementDurationMinutes: replacement.durationMinutes } });
  }
  await db.attendance.updateMany({ where: { lessonId }, data: { status: "RESCHEDULED" } });
  await db.lesson.update({ where: { id: lessonId }, data: { status: "RESCHEDULED", manuallyEdited: true } });
  return db.lesson.create({
    data: {
      ...target,
      scheduledDate: dateOnly(replacement.date),
      startMinute: replacement.startMinute,
      durationMinutes: replacement.durationMinutes,
      title: lesson.title,
      goal: lesson.goal,
      recurringScheduleId: lesson.recurringScheduleId,
      scheduleRevision: lesson.scheduleRevision,
      originalLessonId: lesson.id,
      manuallyEdited: true,
      attendance: { create: lesson.attendance.map(({ studentId }) => ({ studentId, status: "PLANNED" })) },
    },
  });
}

export async function removeOccurrence(db: Db, lessonId: string) {
  const lesson = await findOccurrence(db, lessonId);
  if (!isEmptyPlannedOccurrence(occurrenceSnapshot(lesson))) throw new ScheduleDomainError(OCCURRENCE_HAS_HISTORY);
  const original = lesson.originalLessonId ? await findOccurrence(db,lesson.originalLessonId) : null;
  if (original && hasRealLessonHistory(occurrenceSnapshot(original))) throw new ScheduleDomainError(OCCURRENCE_HAS_HISTORY);
  const source = original ?? lesson;
  if (source.recurringScheduleId) {
    const sourceDate = sourceOccurrenceDate(source.generationKey) ?? toDateInput(source.scheduledDate);
    await db.scheduleException.deleteMany({ where: { scheduleId: source.recurringScheduleId, occurrenceDate: dateOnly(sourceDate) } });
    await db.scheduleException.create({ data: { scheduleId: source.recurringScheduleId, occurrenceDate: dateOnly(sourceDate), kind: "BREAK", note: "Удалено из расписания" } });
  }
  const lessonIds=original?[lesson.id,original.id]:[lesson.id];
  await db.attendance.deleteMany({ where: { lessonId: { in: lessonIds } } });
  await db.lesson.delete({ where: { id: lessonId } });
  if (original) await db.lesson.delete({ where: { id: original.id } });
  return { id: lessonId, removedIds: lessonIds };
}

export async function cancelOccurrenceRecord(db: Db, lessonId: string) {
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  if (lesson.status !== "PLANNED") throw new ScheduleDomainError("Отменить можно только запланированное занятие.");
  await db.lesson.update({ where: { id: lessonId }, data: { status: "CANCELLED", manuallyEdited: true } });
  await db.attendance.updateMany({ where: { lessonId, manuallyEdited: false }, data: { status: "CANCELLED" } });
  if (lesson.recurringScheduleId) {
    const sourceDate=sourceOccurrenceDate(lesson.generationKey)??toDateInput(lesson.scheduledDate);
    await db.scheduleException.deleteMany({where:{scheduleId:lesson.recurringScheduleId,occurrenceDate:dateOnly(sourceDate)}});
    await db.scheduleException.create({data:{scheduleId:lesson.recurringScheduleId,occurrenceDate:dateOnly(sourceDate),kind:"CANCEL"}});
  }
  return { id: lessonId, status: "CANCELLED" as const };
}
