import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { dateLabel } from "@/lib/format";
import { ScheduleSummary } from "@/components/schedule-summary";
export const dynamic = "force-dynamic";
export default async function SchedulePage({ params }: { params: Promise<{ scheduleId: string }> }) { const { scheduleId } = await params; const schedule = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId }, include: { student: true, cohort: true, slots: true } }); if (!schedule) notFound(); const owner = schedule.student ?? schedule.cohort!; return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Регулярное расписание · версия {schedule.revision}</p><h1>{owner.name}</h1><p className="lede">Начало серии: {dateLabel(schedule.effectiveFrom)} · {schedule.timezone}</p></div><Link className="button" href={`/schedules/${schedule.id}/edit`}>Изменить будущие</Link></section><section className="compact-schedule-panel"><ScheduleSummary slots={schedule.slots} effectiveTo={schedule.effectiveTo} /><div className="schedule-guidance"><p>Отдельное занятие можно перенести из раздела «Календарь». Сгенерированные даты не дублируются в карточке ученика или группы.</p><Link className="secondary-button" href="/calendar">Открыть календарь</Link></div></section></div>; }
