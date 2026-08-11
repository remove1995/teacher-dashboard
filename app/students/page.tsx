import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { money, statusLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const [students, cohorts] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" }, include: { tags: { include: { tag: true } }, memberships: { where: { OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }, include: { cohort: true } }, billingProfiles: { where: { cohortId: null }, orderBy: { effectiveFrom: "desc" }, take: 1 }, individualSchedules: { where: { status: "ACTIVE" }, take: 1 } } }),
    prisma.cohort.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], include: { tags: { include: { tag: true } }, memberships: { where: { OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }, include: { student: true } }, schedules: { where: { status: "ACTIVE" }, take: 1 } } }),
  ]);
  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">Люди и форматы</p><h1>Ученики</h1><p className="lede">Ученики могут заниматься индивидуально и одновременно состоять в нескольких парах или группах.</p></div><div className="heading-actions wrap-actions"><Link className="secondary-button" href="/cohorts/new?kind=PAIR">Новая пара</Link><Link className="secondary-button" href="/cohorts/new?kind=GROUP">Новая группа</Link><Link className="button" href="/students/new">Новый ученик</Link></div></section>
    <section><div className="section-heading"><div><p className="eyebrow">Персоны</p><h2>Все ученики · {students.length}</h2></div></div><div className="entity-grid">{students.map((student) => { const billing = student.billingProfiles[0]; return <Link className="entity-card" href={`/students/${student.id}`} key={student.id} style={{ "--entity-color": student.color } as React.CSSProperties}>
      <div className="entity-visual">{student.imageUrl ? <img src={student.imageUrl} alt="" /> : <span>{student.name.slice(0,1)}</span>}</div><div className="entity-copy"><div className="entity-title"><h3>{student.name}</h3><span className={`status-pill status-${student.status.toLowerCase()}`}>{statusLabels[student.status]}</span></div><p>{student.yearOrLevel ?? "Уровень не указан"}{billing ? ` · ${money(billing.amountMinor)}` : ""}</p><div className="tag-list">{student.tags.map(({tag}) => <span key={tag.id}>{tag.name}</span>)}{student.memberships.map(({cohort}) => <span key={cohort.id}>{cohort.name}</span>)}</div></div><span className="card-arrow">→</span>
    </Link>; })}</div></section>
    <section><div className="section-heading"><div><p className="eyebrow">Совместные занятия</p><h2>Пары и группы · {cohorts.length}</h2></div></div><div className="entity-grid">{cohorts.map((cohort) => <Link className="entity-card" href={`/cohorts/${cohort.id}`} key={cohort.id} style={{ "--entity-color": cohort.color } as React.CSSProperties}>
      <div className="entity-visual"><span>{cohort.kind === "PAIR" ? "2" : cohort.memberships.length}</span></div><div className="entity-copy"><div className="entity-title"><h3>{cohort.name}</h3><span className="status-pill">{cohort.kind === "PAIR" ? "Пара" : "Группа"}</span></div><p>{cohort.memberships.map(({student}) => student.name).join(", ")}</p><div className="tag-list">{cohort.tags.map(({tag}) => <span key={tag.id}>{tag.name}</span>)}{cohort.schedules.length ? <span>Есть расписание</span> : <span>Без расписания</span>}</div></div><span className="card-arrow">→</span>
    </Link>)}</div></section>
  </div>;
}
