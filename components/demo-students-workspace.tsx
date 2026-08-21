"use client";

import Link from "next/link";
import { useState } from "react";
import { filterDemoPeople, type DemoPeopleFilter } from "@/lib/demo/data";

const filters: Array<[DemoPeopleFilter, string]> = [["ALL", "Все"], ["INDIVIDUAL", "Индивидуальные"], ["PAIR", "Пары"], ["GROUP", "Группы"]];
const statuses = { ACTIVE: "Занимается", PAUSED: "Пауза", COMPLETED: "Обучение завершено" } as const;

export function DemoStudentsWorkspace({ routePrefix }: { routePrefix: string }) {
  const [filter, setFilter] = useState<DemoPeopleFilter>("ALL");
  const [query, setQuery] = useState("");
  const { students, cohorts } = filterDemoPeople(filter, query);

  return <>
    <div className="demo-readonly-toolbar demo-students-toolbar">
      <div className="students-filters" aria-label="Формат обучения">{filters.map(([value, label]) => <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
      <input aria-label="Поиск ученика" placeholder="Поиск ученика" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button disabled title="Доступно в полной версии">Новый ученик</button>
    </div>
    <div className="demo-result-count">Найдено: {students.length + cohorts.length}</div>
    {students.length + cohorts.length ? <section className="students-list-grid" aria-label="Demo-список учеников">
      {students.map((student) => <Link className="student-list-card" href={`${routePrefix}/students/${student.id}/`} key={student.id} style={{ "--entity-color": student.color } as React.CSSProperties}><span className="student-list-avatar">{student.name.slice(0, 1)}</span><span className="student-list-copy"><strong>{student.name}</strong><small>{student.format} · {student.level}</small></span><span className={`student-list-status status-${student.status.toLowerCase()}`}><i />{statuses[student.status]}</span><span className="student-list-open">Просмотр →</span></Link>)}
      {cohorts.map((cohort) => <article className="student-list-card demo-static-card" key={cohort.id} style={{ "--entity-color": cohort.color } as React.CSSProperties}><span className="student-list-avatar">{cohort.participants}</span><span className="student-list-copy"><strong>{cohort.name}</strong><small>{cohort.kind === "PAIR" ? "Пара" : "Группа"} · {cohort.participants} участн.</small></span><span className="student-list-status status-active"><i />Занимаются</span><span className="student-list-open">Просмотр</span></article>)}
    </section> : <section className="empty-state demo-empty-compact"><h2>Ничего не найдено</h2><p>Измените запрос или выберите другой формат.</p></section>}
  </>;
}
