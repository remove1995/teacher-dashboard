import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/format";
import { getFinanceWorkspace, monthPeriod, shiftMonth } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";
const statusLabels = { EXPECTED: "Ожидается", PARTIALLY_PAID: "Частично", PAID: "Оплачено", OVERPAID: "Переплата" } as const;

export default async function StudentFinancePage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { studentId } = await params; const query = await searchParams;
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true } });
  if (!student) notFound();
  const period = monthPeriod(query.month ?? "");
  const workspace = await getFinanceWorkspace(period);
  const contexts = workspace.rows.flatMap((row) => row.participants.filter((participant) => participant.studentId === studentId).map((participant) => ({ row, participant })));
  const totals = contexts.reduce((sum, { participant }) => ({ expected: sum.expected + participant.expectedMinor, received: sum.received + participant.receivedMinor, balance: sum.balance + participant.balanceMinor, credit: sum.credit + participant.creditMinor }), { expected: 0, received: 0, balance: 0, credit: 0 });
  return <div className="student-finance"><header className="page-heading"><div><p className="eyebrow">Профиль ученика</p><h1>Финансы · {student.name}</h1></div><div className="payment-month"><Link href={`?month=${shiftMonth(period, -1)}`}>‹</Link><strong>{period.label}</strong><Link href={`?month=${shiftMonth(period, 1)}`}>›</Link></div></header><section className="finance-summary"><article><span>Ожидается</span><strong>{money(totals.expected)}</strong></article><article><span>Получено</span><strong>{money(totals.received)}</strong></article><article><span>Баланс</span><strong>{money(totals.balance)}</strong></article><article><span>Кредиты</span><strong>{money(totals.credit)}</strong></article></section><section className="student-finance-contexts">{contexts.map(({ row, participant }) => <article key={participant.key} style={{ "--entity-color": row.color } as React.CSSProperties}><header><div><small>{participant.kind === "INDIVIDUAL" ? "Индивидуально" : participant.kind === "PAIR" ? "Пара" : "Группа"}</small><h2>{participant.contextName}</h2></div><span className={`payment-status status-${participant.status.toLowerCase()}`}>{statusLabels[participant.status]}</span></header><div className="student-finance-numbers"><span>Ожидается <strong>{money(participant.expectedMinor)}</strong></span><span>Получено <strong>{money(participant.receivedMinor)}</strong></span><span>Баланс <strong>{money(participant.balanceMinor)}</strong></span></div><p>{participant.calculationNote}</p><footer>{participant.payments.length ? participant.payments.map((payment) => <span key={payment.id}>{payment.date ?? "Без даты"} · {money(payment.amountMinor)}</span>) : <span>Платежей за период нет</span>}<Link href={`/payments?month=${period.key}&add=${encodeURIComponent(participant.key)}`}>Открыть в оплатах →</Link></footer></article>)}{!contexts.length && <div className="learning-empty">Нет финансовых контекстов в этом периоде.</div>}</section></div>;
}
