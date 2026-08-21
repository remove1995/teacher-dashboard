import { PagePlaceholder } from "@/components/page-placeholder";
import { demoAttendance, demoLessons, demoStudentById } from "@/lib/demo/data";

const labels = { PRESENT: "Присутствовал", ABSENT: "Отсутствовал", CANCELLED: "Отменено", RESCHEDULED: "Перенесено", PLANNED: "Запланировано" } as const;

export default function DemoAttendancePage() {
  const rows = demoAttendance.map((entry) => ({ ...entry, student: demoStudentById(entry.studentId), lesson: demoLessons.find(({ id }) => id === entry.lessonId) })).filter((row) => row.student && row.lesson).sort((a, b) => b.lesson!.date.localeCompare(a.lesson!.date));
  return <PagePlaceholder title="Посещаемость">
    <div className="demo-readonly-toolbar"><strong>Август 2026</strong><span>Все форматы</span><button disabled title="Доступно в полной версии">Изменить отметки</button></div>
    <section className="finance-list demo-attendance-list" aria-label="Demo-посещаемость">{rows.map((row) => <article className="demo-attendance-row" key={`${row.lessonId}:${row.studentId}`}><div><strong>{row.student!.name}</strong><small>{row.student!.format}</small></div><div><time>{row.lesson!.date} · {row.lesson!.startTime}</time><small>{row.lesson!.title}</small></div><span className={`demo-attendance-status status-${row.status.toLowerCase()}`}>{labels[row.status]}</span></article>)}</section>
  </PagePlaceholder>;
}
