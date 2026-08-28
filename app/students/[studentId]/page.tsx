import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { billingLabels, money, statusLabels } from "@/lib/format";
import { ScheduleSummary } from "@/components/schedule-summary";
import { StudentLifecycleActions } from "@/components/student-lifecycle-actions";

export const dynamic = "force-dynamic";

export default async function StudentOverviewPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const now = new Date();
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: {
    tags: { include: { tag: true } },
    memberships: { where: { activeFrom: { lte: now }, OR: [{ activeTo: null }, { activeTo: { gte: now } }] }, include: { cohort: true } },
    billingProfiles: { where: { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }, orderBy: { effectiveFrom: "desc" } },
    individualSchedules: { where: { status: "ACTIVE" }, orderBy: { effectiveFrom: "desc" }, include: { slots: true } },
  } });
  if (!student) notFound();
  const [recentLearning, recentTests] = await Promise.all([
    prisma.learningRecord.findMany({ where: { studentId }, orderBy: { entryDate: "desc" }, take: 3 }),
    prisma.testResult.findMany({ where: { studentId }, orderBy: { testDate: "desc" }, take: 3 }),
  ]);
  const recentEntries = [
    ...recentLearning.map((entry) => ({ id: `record:${entry.id}`, date: entry.entryDate, label: entry.kind === "VOCABULARY" ? "Лексика" : entry.kind === "GRAMMAR_FUNCTION" ? "Грамматика / функции" : "Заметка", title: entry.title })),
    ...recentTests.map((entry) => ({ id: `test:${entry.id}`, date: entry.testDate, label: "Тест / checkpoint", title: entry.title })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
  const individualBilling = student.billingProfiles.find((profile) => profile.cohortId === null);
  const schedule = student.individualSchedules[0];
  const contexts = [
    ...(individualBilling ? [{ id: "individual", label: "Индивидуально", href: null }] : []),
    ...student.memberships.map(({ cohort }) => ({ id: cohort.id, label: `${cohort.kind === "PAIR" ? "Пара" : "Группа"}: ${cohort.name}`, href: `/cohorts/${cohort.id}` })),
  ];
  return <>
    <section className="profile-hero" style={{ "--entity-color": student.color } as React.CSSProperties}><div className="profile-visual">{student.imageUrl ? <img src={student.imageUrl} alt="" /> : student.name.slice(0,1)}</div><div className="profile-identity"><p className="eyebrow">Ученик</p><h1>{student.name}</h1><div className="profile-meta"><span>{statusLabels[student.status]}</span>{student.yearOrLevel ? <span>{student.yearOrLevel}</span> : null}</div><div className="tag-list">{student.tags.map(({tag}) => <span key={tag.id}>{tag.name}</span>)}</div><div className="profile-actions"><Link className="button" href={`/lessons?entity=student:${student.id}`}>Открыть уроки</Link><Link className="secondary-button" href={`/students/${student.id}/edit`}>Редактировать профиль</Link><StudentLifecycleActions studentId={student.id} studentName={student.name} /></div></div><img className="profile-hero-decoration" src="/assets/books-botanical-center.png" alt="" aria-hidden="true" /></section>
    <section className="profile-overview-grid profile-overview-compact">
      <article className="panel profile-info-decoration-panel"><p className="eyebrow">Формат обучения</p><div className="profile-contexts">{contexts.map((context) => context.href ? <Link key={context.id} href={context.href}>{context.label}</Link> : <span key={context.id}>{context.label}</span>)}{!contexts.length && <p className="muted">Активный формат не настроен.</p>}</div><img className="profile-info-decoration" src="/assets/decor-branch-sage.png" alt="" aria-hidden="true" /></article>
      <article className="panel"><p className="eyebrow">Оплата</p><div className="profile-billing-list">{student.billingProfiles.map((billing) => { const cohort = student.memberships.find((membership) => membership.cohortId === billing.cohortId)?.cohort; return <div key={billing.id}><strong>{money(billing.amountMinor)}</strong><span>{cohort?.name ?? "Индивидуально"} · {billingLabels[billing.model]}</span></div>; })}{!student.billingProfiles.length && <p className="muted">Профиль оплаты не задан.</p>}</div></article>
      <article className="panel"><p className="eyebrow">Регулярное расписание</p>{schedule ? <><ScheduleSummary slots={schedule.slots} effectiveTo={schedule.effectiveTo} /><Link href={`/schedules/${schedule.id}`}>Изменить расписание →</Link></> : <><p className="muted">Индивидуальное расписание не создано.</p><Link href={`/schedules/new?studentId=${student.id}`}>Создать расписание →</Link></>}</article>
      <article className="panel learning-overview profile-records-decoration-panel"><div className="learning-overview-title"><p className="eyebrow">Последние записи</p><Link href={`/students/${student.id}/learning`}>Все записи →</Link></div>{recentEntries.length ? <div>{recentEntries.map((entry) => <Link href={`/students/${student.id}/learning`} key={entry.id}><small>{entry.label} · {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(entry.date)}</small><strong>{entry.title}</strong></Link>)}</div> : <p className="muted">Записей об обучении пока нет.</p>}<img className="profile-records-decoration" src="/assets/decor-branch-peach.png" alt="" aria-hidden="true" /></article>
    </section>
  </>;
}
