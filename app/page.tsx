import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";
import { prisma } from "@/lib/db/prisma";
import { dateOnly, minuteToTime, todayDate } from "@/lib/domain/dates";
import { getTeacherSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);

export default async function DashboardPage() {
  const settings = await getTeacherSettings();
  const todayStart = dateOnly(todayDate(settings.timezone));
  const weekStart = new Date(todayStart); weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth() + 1, 1));
  const [todayLessons, weekLessons, upcomingLessons, payments, missingHomework] = await Promise.all([
    prisma.lesson.findMany({ where: { scheduledDate: todayStart, status: { in: ["PLANNED", "COMPLETED"] } }, orderBy: { startMinute: "asc" } }),
    prisma.lesson.findMany({ where: { scheduledDate: { gte: weekStart, lt: weekEnd }, status: { in: ["PLANNED", "COMPLETED"] } }, select: { status: true } }),
    prisma.lesson.findMany({ where: { scheduledDate: { gte: todayStart }, status: "PLANNED" }, orderBy: [{ scheduledDate: "asc" }, { startMinute: "asc" }], take: 5, include: { student: { select: { name: true, color: true } }, cohort: { select: { name: true, color: true } } } }),
    prisma.payment.findMany({ where: { OR: [{ paymentDate: { gte: monthStart, lt: monthEnd } }, { periodStart: { lt: monthEnd }, periodEnd: { gte: monthStart } }] } }),
    prisma.lesson.count({ where: { status: "COMPLETED", OR: [{ homeworkText: null }, { homeworkText: "" }] } }),
  ]);
  const received = payments.reduce((sum, payment) => payment.paymentDate && payment.paymentDate >= monthStart && payment.paymentDate < monthEnd ? sum + payment.actualAmountMinor : sum, 0);
  const expected = payments.reduce((sum, payment) => sum + Math.max(0, payment.suggestedAmountMinor - payment.actualAmountMinor), 0);
  const partialCount = payments.filter(({ status }) => status === "PARTIALLY_PAID").length;
  const overdueCount = payments.filter(({ status }) => status === "OVERDUE").length;
  const attentionCount = missingHomework + partialCount + overdueCount;
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(monthStart);
  const next = todayLessons.find(({ status }) => status === "PLANNED");

  return <PagePlaceholder title={`Добрый день, ${settings.displayName}!`}>
    <section className="summary-grid" aria-label="Сводка">
      <article className="summary-card"><span>Уроков сегодня</span><strong>{todayLessons.length}</strong><small>{next ? `Следующий в ${minuteToTime(next.startMinute)}` : "На сегодня всё"}</small></article>
      <article className="summary-card"><span>На этой неделе</span><strong>{weekLessons.length}</strong><small>{weekLessons.filter(({ status }) => status === "COMPLETED").length} завершено</small></article>
      <article className="summary-card"><span>Получено в {monthLabel}</span><strong>{rubles(received)}</strong><small>{expected ? `Ожидается ещё ${rubles(expected)}` : "Ожидаемых оплат нет"}</small></article>
    </section>
    <section className="content-grid">
      <article className="panel"><div className="panel-heading"><h2>Ближайшие уроки</h2><Link href="/lessons">Все уроки →</Link></div>{upcomingLessons.length ? <ul className="dashboard-lesson-list">{upcomingLessons.map((lesson) => <li key={lesson.id}><time>{lesson.scheduledDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })}<br />{minuteToTime(lesson.startMinute)}</time><i style={{ background: lesson.student?.color ?? lesson.cohort?.color }} /><div><strong>{lesson.student?.name ?? lesson.cohort?.name}</strong><small>{lesson.title || "Тема пока не добавлена"}</small></div></li>)}</ul> : <div className="dashboard-empty"><p>Ближайших уроков пока нет.</p><Link href="/students">Добавить ученика →</Link></div>}</article>
      <article className="panel"><div className="panel-heading"><h2>Требует внимания</h2><strong>{attentionCount}</strong></div>{attentionCount ? <ul className="attention-list">{missingHomework > 0 && <li>Добавить домашнее задание · {missingHomework}</li>}{partialCount > 0 && <li>Проверить частичные оплаты · {partialCount}</li>}{overdueCount > 0 && <li>Проверить просроченные оплаты · {overdueCount}</li>}</ul> : <div className="dashboard-empty"><p>Сейчас всё в порядке.</p></div>}</article>
    </section>
  </PagePlaceholder>;
}
