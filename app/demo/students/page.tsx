import { PagePlaceholder } from "@/components/page-placeholder";
import { demoCohorts, demoStudents } from "@/lib/demo/data";

const status = { ACTIVE: "Занимается", PAUSED: "Пауза", COMPLETED: "Обучение завершено" } as const;

export default function DemoStudentsPage() {
  return <PagePlaceholder title="Ученики">
    <div className="demo-readonly-toolbar"><div className="students-filters"><span className="active">Все</span><span>Индивидуальные</span><span>Пары</span><span>Группы</span></div><input aria-label="Поиск ученика" placeholder="Поиск ученика" disabled /><button disabled>Новый ученик</button></div>
    <section className="students-list-grid" aria-label="Demo-список учеников">
      {demoStudents.map((student) => <article className="student-list-card demo-static-card" key={student.id} style={{ "--entity-color": student.color } as React.CSSProperties}><span className="student-list-avatar">{student.name.slice(0, 1)}</span><span className="student-list-copy"><strong>{student.name}</strong><small>{student.format} · {student.level}</small></span><span className={`student-list-status status-${student.status.toLowerCase()}`}><i />{status[student.status]}</span><span className="student-list-open">Просмотр</span></article>)}
      {demoCohorts.map((cohort) => <article className="student-list-card demo-static-card" key={cohort.id} style={{ "--entity-color": cohort.color } as React.CSSProperties}><span className="student-list-avatar">{cohort.participants}</span><span className="student-list-copy"><strong>{cohort.name}</strong><small>{cohort.kind === "PAIR" ? "Пара" : "Группа"} · {cohort.participants} участн.</small></span><span className="student-list-status status-active"><i />Занимаются</span><span className="student-list-open">Просмотр</span></article>)}
    </section>
  </PagePlaceholder>;
}
