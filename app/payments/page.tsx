import Link from "next/link";
import { PaymentsWorkspace } from "@/components/payments-workspace";
import { ExtraIncomeWorkspace } from "@/components/extra-income-workspace";
import { getFinanceOverview } from "@/lib/services/finance-overview-service";
import { getTeacherSettings } from "@/lib/settings";
import { todayDate } from "@/lib/domain/dates";
import { filterFinanceRows, type DerivedPaymentStatus, type FinanceEntityKind } from "@/lib/domain/money";
import { monthPeriod, shiftMonth } from "@/lib/services/finance-service";

type Search = { month?: string; kind?: string; status?: string; q?: string; add?: string; editPayment?: string; tab?: string; addIncome?: string; editIncome?: string };
const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(minor / 100);
const kindLabels = { ALL: "Все", INDIVIDUAL: "Индивидуальные", PAIR: "Пары", GROUP: "Группы" } as const;
const statusLabels = { ALL: "Все статусы", EXPECTED: "Ожидается", PARTIALLY_PAID: "Частично", PAID: "Оплачено", OVERPAID: "Переплата" } as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const period = monthPeriod(search.month ?? "");
  const overview = await getFinanceOverview(period);
  const workspace = overview.student;
  const other = search.tab === "other";
  const kind = Object.hasOwn(kindLabels, search.kind ?? "") ? search.kind as keyof typeof kindLabels : "ALL";
  const status = Object.hasOwn(statusLabels, search.status ?? "") ? search.status as keyof typeof statusLabels : "ALL";
  const rows = filterFinanceRows(workspace.rows, { kind: kind as "ALL" | FinanceEntityKind, status: status as "ALL" | DerivedPaymentStatus, search: search.q });
  const query = (next: Partial<Search>) => new URLSearchParams(Object.entries({ month: period.key, tab: other ? "other" : "students", kind, status, q: search.q ?? "", ...next }).filter(([, value]) => value)).toString();
  const firstParticipant = rows.flatMap((row) => row.participants)[0];
  const tabs = <nav className="finance-tabs payment-kind-filter" aria-label="Разделы финансов"><Link href={`?month=${period.key}&tab=students`} className={!other ? "active" : ""} aria-current={!other ? "page" : undefined}>Оплаты учеников</Link><Link href={`?month=${period.key}&tab=other`} className={other ? "active" : ""} aria-current={other ? "page" : undefined}>Другие доходы</Link></nav>;
  const total = <section className="panel finance-cash-overview" aria-label="Общий доход за месяц"><span>Всего получено · {period.label}</span><strong>{rubles(overview.cash.totalReceivedMinor)}</strong><small>{rubles(overview.cash.studentReceivedMinor)} от учеников · {rubles(overview.cash.otherReceivedMinor)} другие доходы</small></section>;
  if (other) {
    const settings = await getTeacherSettings();
    return <div className="page-stack payments-workspace">
      <header className="page-heading payment-heading"><h1>Финансы</h1><Link className="button" href={`?month=${period.key}&tab=other&addIncome=1`}>+ Добавить доход</Link></header>
      {tabs}{total}
      <section className="payment-controls extra-income-controls"><div className="payment-month"><Link aria-label="Предыдущий месяц" href={`?month=${shiftMonth(period, -1)}&tab=other`}>‹</Link><strong>{period.label}</strong><Link aria-label="Следующий месяц" href={`?month=${shiftMonth(period, 1)}&tab=other`}>›</Link></div></section>
      <ExtraIncomeWorkspace key={period.key} records={overview.other.records.map((record) => ({ id: record.id, amountMinor: record.amountMinor, receivedAt: record.receivedAt.toISOString().slice(0, 10), title: record.title, category: record.tag.name, receiptUrl: record.receiptUrl, comment: record.comment }))} tags={overview.other.tags} receivedMinor={overview.other.receivedMinor} month={period.key} today={todayDate(settings.timezone)} add={search.addIncome === "1"} edit={search.editIncome} />
    </div>;
  }
  return <div className="page-stack payments-workspace">
    <header className="page-heading payment-heading"><h1>Финансы</h1>{firstParticipant ? <a className="button" href={`?${query({ add: firstParticipant.key })}`}>Добавить оплату</a> : <Link className="secondary-button" href="/students/new">Добавить ученика</Link>}</header>
    {tabs}{total}
    <section className="payment-controls">
      <div className="payment-month"><Link href={`?${query({ month: shiftMonth(period, -1) })}`}>‹</Link><label><input type="month" defaultValue={period.key}/><strong>{period.label}</strong></label><Link href={`?${query({ month: shiftMonth(period, 1) })}`}>›</Link></div>
      <nav className="payment-kind-filter">{Object.entries(kindLabels).map(([value, label]) => <Link className={kind === value ? "active" : ""} key={value} href={`?${query({ kind: value })}`}>{label}</Link>)}</nav>
      <form className="payment-search"><input name="q" defaultValue={search.q} placeholder="Ученик или группа"/><input type="hidden" name="month" value={period.key}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="status" value={status}/><button>Найти</button></form>
      <nav className="payment-status-filter">{Object.entries(statusLabels).map(([value, label]) => <Link className={status === value ? "active" : ""} key={value} href={`?${query({ status: value })}`}>{label}</Link>)}</nav>
    </section>
    <PaymentsWorkspace key={`${period.key}:${kind}:${status}:${search.q ?? ""}`} rows={rows} period={period} summary={workspace.summary} otherReceivedMinor={overview.other.receivedMinor} openKey={search.add} editPaymentId={search.editPayment}/>
  </div>;
}
