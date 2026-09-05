import { notFound } from "next/navigation";
import { updateOnlyOccurrence } from "@/app/actions/schedules";
import { ScheduleOccurrenceForm } from "@/components/schedule-occurrence-form";
import { prisma } from "@/lib/db/prisma";
import { minuteToTime } from "@/lib/domain/dates";
import { dateLabel } from "@/lib/format";
export default async function EditOccurrencePage({ params }: { params: Promise<{ scheduleId: string; lessonId: string }> }) { const { scheduleId, lessonId } = await params; const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, recurringScheduleId: scheduleId }, include: { student: true, cohort: true } }); if (!lesson) notFound(); return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Только это занятие</p><h1>{(lesson.student ?? lesson.cohort)?.name}</h1><p className="lede">Исходный урок {dateLabel(lesson.scheduledDate)} останется в истории как перенесённый, а новое занятие будет связано с ним.</p></div></section><ScheduleOccurrenceForm action={updateOnlyOccurrence.bind(null,lesson.id)} cancelHref={`/schedules/${scheduleId}`} date={lesson.scheduledDate.toISOString().slice(0,10)} startTime={minuteToTime(lesson.startMinute)} durationMinutes={lesson.durationMinutes}/></div>; }
