import type { Prisma, PrismaClient } from "@prisma/client";
import { dateOnly, previousDate, todayDate, toDateInput } from "@/lib/domain/dates";
import { generateOccurrences, nextScheduleRevision, sourceOccurrenceDate, type WeeklySlot } from "@/lib/domain/schedule";
import { defaultLessonDate } from "@/lib/domain/lesson";

type Db = PrismaClient | Prisma.TransactionClient;

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
    select: { name: true, memberships: { where: { activeFrom: { lte: occurrenceDate }, OR: [{ activeTo: null }, { activeTo: { gte: occurrenceDate } }] }, select: { studentId: true } } },
  });
  return { title: `Урок · ${cohort.name}`, attendanceStudentIds: cohort.memberships.map(({ studentId }) => studentId) };
}

async function generateLessons(db: Db, schedule: { id: string; revision: number; effectiveFrom: Date; effectiveTo: Date | null; studentId: string | null; cohortId: string | null; timezone: string; slots: WeeklySlot[] }, excludedSourceDates = new Set<string>()) {
  if (!schedule.effectiveTo) throw new Error("Phase 1 schedules require an effective end date");
  const start = [toDateInput(schedule.effectiveFrom), todayDate(schedule.timezone)].sort().at(-1)!;
  const end = toDateInput(schedule.effectiveTo);
  if (start > end) return 0;
  const target: ScheduleTarget = schedule.studentId ? { studentId: schedule.studentId } : { cohortId: schedule.cohortId! };
  const occurrences = generateOccurrences({ effectiveFrom: start, effectiveTo: end, slots: schedule.slots }).filter(({ date }) => !excludedSourceDates.has(date));
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
  const schedule = await db.recurringSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { slots: true } });
  return generateLessons(db, schedule);
}

export async function createSchedule(db: Db, definition: ScheduleDefinition) {
  if (definition.effectiveTo < definition.effectiveFrom) throw new Error("Schedule end date must not be before its start date");
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
  const current = await db.recurringSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { slots: true } });
  if (changeFrom < todayDate(current.timezone)) throw new Error("Past schedules cannot be changed");
  if (cutoff < current.effectiveFrom || (current.effectiveTo && cutoff > current.effectiveTo)) throw new Error("Change date must be inside the schedule period");
  if (definition.effectiveTo < changeFrom) throw new Error("Schedule end date must not be before the change date");

  const futureLessons = await db.lesson.findMany({ where: { recurringScheduleId: scheduleId, scheduledDate: { gte: cutoff } }, select: { id: true, generationKey: true, manuallyEdited: true, kanbanVisible: true, status: true } });
  const preservedSourceDates = new Set(futureLessons.filter(({ manuallyEdited, kanbanVisible, status }) => manuallyEdited || kanbanVisible || status !== "PLANNED").flatMap(({ generationKey }) => { const value = sourceOccurrenceDate(generationKey); return value ? [value] : []; }));
  const replaceableIds = futureLessons.filter(({ manuallyEdited, kanbanVisible, status }) => !manuallyEdited && !kanbanVisible && status === "PLANNED").map(({ id }) => id);
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
  return { schedule: next, generatedCount, preservedCount: futureLessons.length - replaceableIds.length };
}

export async function rescheduleOccurrence(db: Db, lessonId: string, replacement: { date: string; startMinute: number; durationMinutes: number }) {
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { attendance: true, recurringSchedule: { select: { timezone: true } } } });
  const today = todayDate(lesson.recurringSchedule?.timezone);
  if (toDateInput(lesson.scheduledDate) < today) throw new Error("Past lessons cannot be rescheduled");
  if (replacement.date < today) throw new Error("A replacement lesson cannot be moved into the past");
  if (lesson.status !== "PLANNED") throw new Error("Only planned lessons can be rescheduled");
  const target: ScheduleTarget = lesson.studentId ? { studentId: lesson.studentId } : { cohortId: lesson.cohortId! };
  if (lesson.recurringScheduleId) {
    await db.scheduleException.deleteMany({ where: { scheduleId: lesson.recurringScheduleId, occurrenceDate: lesson.scheduledDate } });
    await db.scheduleException.create({ data: { scheduleId: lesson.recurringScheduleId, occurrenceDate: lesson.scheduledDate, kind: "OCCURRENCE_OVERRIDE", replacementDate: dateOnly(replacement.date), replacementStartMinute: replacement.startMinute, replacementDurationMinutes: replacement.durationMinutes } });
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
