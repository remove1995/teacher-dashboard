import { notFound } from "next/navigation";
import { updateRecurringSchedule } from "@/app/actions/schedules";
import { ScheduleForm } from "@/components/schedule-form";
import { prisma } from "@/lib/db/prisma";
export default async function EditSchedulePage({ params }: { params: Promise<{ scheduleId: string }> }) { const { scheduleId } = await params; const schedule = await prisma.recurringSchedule.findUnique({ where: { id: scheduleId }, include: { student: true, cohort: true, slots: true } }); if (!schedule || !schedule.effectiveTo) notFound(); return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Изменение серии</p><h1>{(schedule.student ?? schedule.cohort)?.name}</h1><p className="lede">Будет создана новая версия расписания. Прошлые уроки и будущие уроки с ручными правками сохранятся.</p></div></section><ScheduleForm action={updateRecurringSchedule.bind(null, schedule.id)} values={schedule} mode="future" /></div>; }
