import Link from "next/link";
import { PaymentsWorkspace } from "@/components/payments-workspace";
import { filterFinanceRows, type DerivedPaymentStatus, type FinanceEntityKind } from "@/lib/domain/money";
import { getFinanceWorkspace, monthPeriod, shiftMonth } from "@/lib/services/finance-service";

type Search = { month?: string; kind?: string; status?: string; q?: string; add?: string; editPayment?: string };
const kindLabels = { ALL: "Все", INDIVIDUAL: "Индивидуальные", PAIR: "Пары", GROUP: "Группы" } as const;
const statusLabels = { ALL: "Все статусы", EXPECTED: "Ожидается", PARTIALLY_PAID: "Частично", PAID: "Оплачено", OVERPAID: "Переплата" } as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const period = monthPeriod(search.month ?? "");
  const workspace = await getFinanceWorkspace(period);
  const kind = Object.hasOwn(kindLabels, search.kind ?? "") ? search.kind as keyof typeof kindLabels : "ALL";
  const status = Object.hasOwn(statusLabels, search.status ?? "") ? search.status as keyof typeof statusLabels : "ALL";
  const rows = filterFinanceRows(workspace.rows, { kind: kind as "ALL" | FinanceEntityKind, status: status as "ALL" | DerivedPaymentStatus, search: search.q });
  const query = (next: Partial<Search>) => new URLSearchParams(Object.entries({ month: period.key, kind, status, q: search.q ?? "", ...next }).filter(([, value]) => value)).toString();
  const firstParticipant = rows.flatMap((row) => row.participants)[0];
  return <div className="page-stack payments-workspace">
    <header className="page-heading payment-heading"><h1>Оплаты</h1>{firstParticipant ? <a className="button" href={`?${query({ add: firstParticipant.key })}`}>Добавить оплату</a> : <Link className="secondary-button" href="/students/new">Добавить ученика</Link>}</header>
    <section className="payment-controls">
      <div className="payment-month"><Link href={`?${query({ month: shiftMonth(period, -1) })}`}>‹</Link><label><input type="month" defaultValue={period.key}/><strong>{period.label}</strong></label><Link href={`?${query({ month: shiftMonth(period, 1) })}`}>›</Link></div>
      <nav className="payment-kind-filter">{Object.entries(kindLabels).map(([value, label]) => <Link className={kind === value ? "active" : ""} key={value} href={`?${query({ kind: value })}`}>{label}</Link>)}</nav>
      <form className="payment-search"><input name="q" defaultValue={search.q} placeholder="Ученик или группа"/><input type="hidden" name="month" value={period.key}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="status" value={status}/><button>Найти</button></form>
      <nav className="payment-status-filter">{Object.entries(statusLabels).map(([value, label]) => <Link className={status === value ? "active" : ""} key={value} href={`?${query({ status: value })}`}>{label}</Link>)}</nav>
    </section>
    <PaymentsWorkspace key={`${period.key}:${kind}:${status}:${search.q ?? ""}`} rows={rows} period={period} summary={workspace.summary} openKey={search.add} editPaymentId={search.editPayment}/>
  </div>;
}
