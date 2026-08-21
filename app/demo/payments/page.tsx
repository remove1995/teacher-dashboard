import { PagePlaceholder } from "@/components/page-placeholder";
import { demoPayments, demoPaymentSummary } from "@/lib/demo/data";

const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);
const statusLabel = { PAID: "Оплачено", PARTIALLY_PAID: "Частично", EXPECTED: "Ожидается" } as const;

export default function DemoPaymentsPage() {
  const summary = demoPaymentSummary();
  return <PagePlaceholder title="Оплаты">
    <section className="finance-summary" aria-label="Demo-финансы"><article><span>Получено</span><strong>{rubles(summary.receivedMinor)}</strong></article><article><span>Ожидается</span><strong>{rubles(summary.outstandingMinor)}</strong></article><article><span>Всего за период</span><strong>{rubles(summary.expectedMinor)}</strong></article><article><span>Валюта</span><strong>₽</strong></article></section>
    <div className="demo-readonly-toolbar"><strong>Август 2026</strong><span>Все форматы · Все статусы</span><button disabled>Добавить оплату</button></div>
    <section className="finance-list demo-finance-list" aria-label="Demo-платежи">
      {demoPayments.map((payment) => <article className="demo-payment-row" key={payment.id}><div><strong>{payment.studentName}</strong><small>{payment.context}</small></div><div><span>{payment.billingModel}</span><small>Ожидается {rubles(payment.expectedMinor)}</small></div><strong>{rubles(payment.receivedMinor)}</strong><span className={`payment-status status-${payment.status.toLowerCase()}`}>{statusLabel[payment.status]}</span></article>)}
    </section>
  </PagePlaceholder>;
}
