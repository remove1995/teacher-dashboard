import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { statusLabels } from "@/lib/format";
import { hasIndividualLearningContext } from "@/lib/domain/people";

export const dynamic = "force-dynamic";

type StudentsSearch = { type?: string; q?: string };
type EntityType = "all" | "individual" | "pair" | "group";

const filters: Array<{ value: EntityType; label: string }> = [
  { value: "all", label: "Все" },
  { value: "individual", label: "Индивидуальные" },
  { value: "pair", label: "Пары" },
  { value: "group", label: "Группы" },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<StudentsSearch> }) {
  const search = await searchParams;
  const activeType = filters.some(({ value }) => value === search.type) ? search.type as EntityType : "all";
  const query = search.q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("ru");

  const [students, cohorts] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" }, include: { tags: { include: { tag: true } }, memberships: { where: { OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }, include: { cohort: true } }, billingProfiles: { where: { cohortId: null }, orderBy: { effectiveFrom: "desc" }, take: 1 }, individualSchedules: { where: { status: "ACTIVE" }, take: 1 } } }),
    prisma.cohort.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], include: { tags: { include: { tag: true } }, memberships: { where: { OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }, include: { student: true } }, schedules: { where: { status: "ACTIVE" }, take: 1 } } }),
  ]);

  const visibleStudents = (activeType === "all" || activeType === "individual")
    ? students.filter((student) => (activeType === "all" || hasIndividualLearningContext(student)) && student.name.toLocaleLowerCase("ru").includes(normalizedQuery))
    : [];
  const visibleCohorts = (activeType === "all" || activeType === "pair" || activeType === "group")
    ? cohorts.filter((cohort) => {
      const matchesType = activeType === "all" || cohort.kind === activeType.toUpperCase();
      const searchable = `${cohort.name} ${cohort.memberships.map(({ student }) => student.name).join(" ")}`.toLocaleLowerCase("ru");
      return matchesType && searchable.includes(normalizedQuery);
    })
    : [];
  const resultCount = visibleStudents.length + visibleCohorts.length;
  const filterHref = (type: EntityType) => `/students?type=${type}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return <div className="page-stack students-list-page">
    <section className="page-heading students-list-heading">
      <h1>Ученики</h1>
    </section>

    <section className="students-toolbar" aria-label="Управление списком учеников">
      <nav className="students-filters" aria-label="Формат обучения">
        {filters.map((filter) => <Link className={activeType === filter.value ? "active" : ""} href={filterHref(filter.value)} key={filter.value}>{filter.label}</Link>)}
      </nav>
      <form className="students-search" action="/students">
        <input type="hidden" name="type" value={activeType} />
        <input name="q" defaultValue={query} type="search" placeholder="Поиск ученика" aria-label="Поиск ученика" />
        <button className="secondary-button" type="submit">Найти</button>
      </form>
      <div className="students-create-actions">
        <Link className="button" href="/students/new">Новый ученик</Link>
        <Link className="secondary-button" href="/cohorts/new?kind=PAIR">Новая пара</Link>
        <Link className="secondary-button" href="/cohorts/new?kind=GROUP">Новая группа</Link>
      </div>
    </section>

    <section aria-label="Список учеников, пар и групп">
      <div className="students-list-meta"><span>{resultCount} {resultCount === 1 ? "запись" : "записей"}</span>{query && <Link href={`/students?type=${activeType}`}>Сбросить поиск</Link>}</div>
      {resultCount > 0 ? <div className="students-list-grid">
        {visibleStudents.map((student) => {
          const formats = [
            hasIndividualLearningContext(student) ? "Индивидуально" : null,
            student.memberships.some(({ cohort }) => cohort.kind === "PAIR") ? "Пара" : null,
            student.memberships.some(({ cohort }) => cohort.kind === "GROUP") ? "Группа" : null,
          ].filter(Boolean).join(" · ");
          return <Link className="student-list-card" href={`/students/${student.id}`} key={student.id} style={{ "--entity-color": student.color } as React.CSSProperties}>
            <span className="student-list-avatar">{student.imageUrl ? <img src={student.imageUrl} alt="" /> : student.name.slice(0, 1)}</span>
            <span className="student-list-copy"><strong>{student.name}</strong><small>{formats || "Индивидуально"}{student.yearOrLevel ? ` · ${student.yearOrLevel}` : ""}</small></span>
            <span className={`student-list-status status-${student.status.toLowerCase()}`}><i aria-hidden="true" />{statusLabels[student.status]}</span>
            <span className="student-list-open">Открыть →</span>
          </Link>;
        })}
        {visibleCohorts.map((cohort) => <Link className="student-list-card" href={`/cohorts/${cohort.id}`} key={cohort.id} style={{ "--entity-color": cohort.color } as React.CSSProperties}>
          <span className="student-list-avatar">{cohort.kind === "PAIR" ? "2" : cohort.memberships.length}</span>
          <span className="student-list-copy"><strong>{cohort.name}</strong><small>{cohort.kind === "PAIR" ? "Пара" : "Группа"} · {cohort.memberships.length} участн.</small></span>
          <span className="student-list-status status-active"><i aria-hidden="true" />Занимаются</span>
          <span className="student-list-open">Открыть →</span>
        </Link>)}
      </div> : <div className="students-list-empty">По выбранным параметрам ничего не найдено.</div>}
    </section>
  </div>;
}
