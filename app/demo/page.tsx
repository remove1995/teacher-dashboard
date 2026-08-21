import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";
import { demoLessons, demoPaymentSummary, demoSettings } from "@/lib/demo/data";

const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);

export default function DemoDashboardPage() {
  const summary = demoPaymentSummary();
  const upcoming = demoLessons.filter(({ status }) => status === "PLANNED");
  return <PagePlaceholder title={`Добрый день, ${demoSettings.teacherName}!`}>
    <section className="summary-grid" aria-label="Сводка demo-данных">
      <article className="summary-card"><span>Ближайшие уроки</span><strong>{upcoming.length}</strong><small>Следующий сегодня в 14:30</small></article>
      <article className="summary-card"><span>Завершено уроков</span><strong>{demoLessons.filter(({ status }) => status === "COMPLETED").length}</strong><small>В демонстрационной выборке</small></article>
      <article className="summary-card"><span>Получено в августе</span><strong>{rubles(summary.receivedMinor)}</strong><small>Ожидается ещё {rubles(summary.outstandingMinor)}</small></article>
    </section>
    <section className="content-grid">
      <article className="panel"><div className="panel-heading"><h2>Ближайшие уроки</h2><Link href="/demo/lessons">Все уроки →</Link></div><div className="demo-compact-list">{upcoming.map((lesson) => <div key={lesson.id}><time>{lesson.date.slice(8, 10)}.08<br />{lesson.startTime}</time><i style={{ background: lesson.color }} /><span><strong>{lesson.entityName}</strong><small>{lesson.title}</small></span></div>)}</div></article>
      <article className="panel"><div className="panel-heading"><h2>Требует внимания</h2><strong>2</strong></div><ul className="attention-list"><li>Добавить домашнее задание</li><li>Проверить частичную оплату</li></ul></article>
    </section>
  </PagePlaceholder>;
}
