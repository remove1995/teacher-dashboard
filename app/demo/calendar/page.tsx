import { PagePlaceholder } from "@/components/page-placeholder";
import { demoLessons } from "@/lib/demo/data";

const dateLabel = (date: string) => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export default function DemoCalendarPage() {
  const lessons = [...demoLessons].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return <PagePlaceholder title="Календарь">
    <div className="demo-readonly-toolbar"><div className="calendar-view-toggle"><span className="active">Неделя</span><span>Месяц</span></div><strong>Демонстрационное расписание</strong><button disabled>+ Добавить урок</button></div>
    <section className="demo-calendar-list" aria-label="Demo-календарь">
      {lessons.map((lesson) => <article className="calendar-lesson" style={{ "--lesson-color": lesson.color } as React.CSSProperties} key={lesson.id}><time><strong>{lesson.startTime}</strong><span>{dateLabel(lesson.date)}</span></time><div><h3>{lesson.entityName}</h3><span>{lesson.title} · {lesson.durationMinutes} минут</span><small className={`demo-status status-${lesson.status.toLowerCase()}`}>{lesson.status === "COMPLETED" ? "Завершён" : "Запланирован"}</small></div></article>)}
    </section>
  </PagePlaceholder>;
}
