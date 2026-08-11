import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function DashboardPage() {
  return (
    <PagePlaceholder eyebrow="Сегодня · демонстрационный режим" title="Добрый день" description="Короткий обзор уроков, внимания и финансов — без лишней аналитики.">
      <section className="summary-grid" aria-label="Сводка">
        <article className="summary-card"><span>Уроков сегодня</span><strong>4</strong><small>Следующий в 14:30</small></article>
        <article className="summary-card"><span>На этой неделе</span><strong>17</strong><small>12 уже завершено</small></article>
        <article className="summary-card"><span>Получено в августе</span><strong>78 500 ₽</strong><small>Ожидается ещё 17 500 ₽</small></article>
      </section>
      <section className="content-grid">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Рабочая область</p><h2>Ближайшие уроки</h2></div><Link href="/lessons">Все уроки</Link></div><div className="skeleton-list"><span /><span /><span /></div></article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Требует внимания</p><h2>3 пункта</h2></div></div><ul className="attention-list"><li>Добавить домашнее задание</li><li>Подтвердить прошедший урок</li><li>Проверить частичную оплату</li></ul></article>
      </section>
    </PagePlaceholder>
  );
}
