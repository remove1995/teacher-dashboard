import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { billingLabels, money, statusLabels } from "@/lib/format";
import { ScheduleSummary } from "@/components/schedule-summary";

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
  const individualBilling = student.billingProfiles.find((profile) => profile.cohortId === null);
  const schedule = student.individualSchedules[0];
  const contexts = [
    ...(individualBilling ? [{ id: "individual", label: "Индивидуально", href: null }] : []),
    ...student.memberships.map(({ cohort }) => ({ id: cohort.id, label: `${cohort.kind === "PAIR" ? "Пара" : "Группа"}: ${cohort.name}`, href: `/cohorts/${cohort.id}` })),
  ];
  return <>
    <section className="profile-hero" style={{ "--entity-color": student.color } as React.CSSProperties}><div className="profile-visual">{student.imageUrl ? <img src={student.imageUrl} alt="" /> : student.name.slice(0,1)}</div><div><p className="eyebrow">Ученик</p><h1>{student.name}</h1><div className="profile-meta"><span>{statusLabels[student.status]}</span>{student.yearOrLevel ? <span>{student.yearOrLevel}</span> : null}</div><div className="tag-list">{student.tags.map(({tag}) => <span key={tag.id}>{tag.name}</span>)}</div></div><div className="profile-actions"><Link className="button" href={`/lessons?entity=student:${student.id}`}>Открыть уроки</Link><Link className="secondary-button" href={`/students/${student.id}/edit`}>Редактировать</Link></div></section>
    <section className="profile-overview-grid profile-overview-compact">
      <article className="panel"><p className="eyebrow">Формат обучения</p><div className="profile-contexts">{contexts.map((context) => context.href ? <Link key={context.id} href={context.href}>{context.label}</Link> : <span key={context.id}>{context.label}</span>)}{!contexts.length && <p className="muted">Активный формат не настроен.</p>}</div></article>
      <article className="panel"><p className="eyebrow">Оплата</p><div className="profile-billing-list">{student.billingProfiles.map((billing) => { const cohort = student.memberships.find((membership) => membership.cohortId === billing.cohortId)?.cohort; return <div key={billing.id}><strong>{money(billing.amountMinor)}</strong><span>{cohort?.name ?? "Индивидуально"} · {billingLabels[billing.model]}</span></div>; })}{!student.billingProfiles.length && <p className="muted">Профиль оплаты не задан.</p>}</div></article>
      <article className="panel"><p className="eyebrow">Регулярное расписание</p>{schedule ? <><ScheduleSummary slots={schedule.slots} effectiveTo={schedule.effectiveTo} /><Link href={`/schedules/${schedule.id}`}>Изменить расписание →</Link></> : <><p className="muted">Индивидуальное расписание не создано.</p><Link href={`/schedules/new?studentId=${student.id}`}>Создать расписание →</Link></>}</article>
    </section>
    <section className="panel"><p className="eyebrow">Личные заметки</p><p>{student.notesPrivate || "Заметок пока нет."}</p></section>
  </>;
}
