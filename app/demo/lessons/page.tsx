import { PagePlaceholder } from "@/components/page-placeholder";
import { demoLessonMonths, demoLessons } from "@/lib/demo/data";

const monthLabel = (month: string) => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

export default function DemoLessonsPage() {
  return <PagePlaceholder title="Уроки">
    <section className="selected-entity-strip"><span>Demo workspace</span><strong>Все ученики и группы</strong><small>Редактирование отключено</small></section>
    <div className="month-board demo-month-board" aria-label="Read-only Kanban">
      {demoLessonMonths().map((month) => {
        const lessons = demoLessons.filter(({ date }) => date.startsWith(month));
        return <section className="month-column" key={month}><header><h2>{monthLabel(month)}</h2><span>{lessons.length}</span></header><div className="demo-lesson-stack">{lessons.map((lesson) => <article className={`lesson-card lesson-card-${lesson.status.toLowerCase()} demo-lesson-card`} style={{ "--lesson-color": lesson.color } as React.CSSProperties} key={lesson.id}><span className="demo-grip" aria-hidden="true">⠿</span><div className="demo-lesson-copy"><div className="lesson-card-time"><span>{lesson.date.slice(8, 10)}.{lesson.date.slice(5, 7)}</span><time>{lesson.startTime}</time></div><h3>{lesson.title}</h3><small>{lesson.entityName}</small><div className="lesson-card-tags">{lesson.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><footer><span>{lesson.completedStages}/{lesson.totalStages} этапов</span><span>{lesson.status === "COMPLETED" ? lesson.homework ? "Завершён" : "Д/з не добавлено" : "Запланирован"}</span></footer></div></article>)}</div></section>;
      })}
    </div>
  </PagePlaceholder>;
}
