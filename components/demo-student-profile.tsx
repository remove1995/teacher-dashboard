import Link from "next/link";
import { demoStudentLessons, demoStudentPayment, type DemoStudent } from "@/lib/demo/data";

const statusLabels = { ACTIVE: "Занимается", PAUSED: "Пауза", COMPLETED: "Обучение завершено" } as const;
const paymentLabels = { PAID: "Оплачено", PARTIALLY_PAID: "Частично оплачено", EXPECTED: "Ожидается" } as const;
const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);

export function DemoStudentProfile({ student, routePrefix }: { student: DemoStudent; routePrefix: string }) {
  const lessons = demoStudentLessons(student.id);
  const upcoming = lessons.find(({ status }) => status === "PLANNED");
  const recent = lessons.filter(({ status }) => status === "COMPLETED").slice(0, 3);
  const payment = demoStudentPayment(student.id);
  return <div className="page-stack demo-profile-page">
    <Link className="demo-back-link" href={`${routePrefix}/students/`}>← Все ученики</Link>
    <section className="profile-hero" style={{ "--entity-color": student.color } as React.CSSProperties}>
      <div className="profile-visual">{student.name.slice(0, 1)}</div>
      <div className="profile-identity"><p className="eyebrow">Ученик</p><h1>{student.name}</h1><div className="profile-meta"><span>{student.format}</span><span>{student.schoolYear}</span><span>{student.level}</span><span>{statusLabels[student.status]}</span></div><div className="profile-actions"><button disabled title="Доступно в полной версии">Редактировать</button><button className="secondary-button" disabled title="Доступно в полной версии">Добавить запись</button></div></div>
    </section>
    <section className="profile-overview-grid demo-profile-grid">
      <article className="panel"><p className="eyebrow">Расписание</p><h2>{upcoming ? `${upcoming.date.slice(8, 10)}.${upcoming.date.slice(5, 7)} · ${upcoming.startTime}` : "Ближайших уроков нет"}</h2><p className="muted">{student.schedule ?? "Регулярное расписание завершено или приостановлено."}</p></article>
      <article className="panel"><p className="eyebrow">Learning / Progress</p><h2>{student.focus}</h2><div className="demo-progress-notes"><p><strong>Сильные стороны</strong>{student.strengths}</p><p><strong>Требует внимания</strong>{student.attention}</p></div></article>
      <article className="panel"><p className="eyebrow">Финансы</p><h2>{paymentLabels[student.billingStatus]}</h2><div className="demo-finance-facts"><span>Тариф <strong>{rubles(student.rateMinor)}</strong></span><span>Последний платёж <strong>{student.lastPaymentDate ?? "—"}</strong></span><span>Задолженность <strong>{payment && payment.expectedMinor > payment.receivedMinor ? rubles(payment.expectedMinor - payment.receivedMinor) : !payment && student.billingStatus === "EXPECTED" ? rubles(student.rateMinor) : "Нет"}</strong></span></div></article>
    </section>
    <section className="panel"><div className="panel-heading"><h2>Последние занятия</h2><span>{recent.length}</span></div>{recent.length ? <div className="history-list demo-history-list">{recent.map((lesson) => <article className="history-row" key={lesson.id} style={{ borderLeftColor: lesson.color }}><time>{lesson.date}</time><div><strong>{lesson.title}</strong><span>{lesson.entityName}</span></div><div><span className="lesson-history-status">Завершён</span><small>{lesson.homework ? `Д/з: ${lesson.homework}` : "Д/з не добавлено"}</small></div></article>)}</div> : <p className="muted">Завершённых занятий пока нет.</p>}</section>
  </div>;
}
