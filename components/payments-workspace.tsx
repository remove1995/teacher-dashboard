"use client";

import { useMemo, useState } from "react";
import { correctPayment, createPayment } from "@/app/actions/payments";
import type { FinanceParentRow, FinanceParticipant, FinancePeriod } from "@/lib/services/finance-service";

const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);
const modelLabels = { MONTHLY_PREPAID: "Предоплата за месяц", WEEKLY_PREPAID: "Предоплата за неделю", PAY_PER_LESSON: "За урок", GROUP_SUBSCRIPTION: "Абонемент группы" } as const;
const statusLabels = { EXPECTED: "Ожидается", PARTIALLY_PAID: "Частично", PAID: "Оплачено", OVERPAID: "Переплата" } as const;

export function PaymentsWorkspace({ rows, period, summary, openKey, editPaymentId }: {
  rows: FinanceParentRow[]; period: FinancePeriod;
  summary: { expectedMinor: number; receivedMinor: number; earnedMinor: number; outstandingMinor: number; creditMinor: number };
  openKey?: string; editPaymentId?: string;
}) {
  const [expanded, setExpanded] = useState(() => new Set(rows.filter((row) => row.kind !== "INDIVIDUAL").map((row) => row.id)));
  const selected = rows.flatMap((row) => row.participants).find((item) => item.key === openKey);
  const editing = rows.flatMap((row) => row.participants).flatMap((item) => item.payments.map((payment) => ({ item, payment }))).find(({ payment }) => payment.id === editPaymentId);
  const currentPayments = useMemo(() => {
    const corrected = new Set(rows.flatMap((row) => row.participants).flatMap((item) => item.payments.map((payment) => payment.correctsPaymentId).filter(Boolean)));
    return corrected;
  }, [rows]);

  return <>
    <section className="finance-summary" aria-label="Итоги периода">
      <article><span>Получено</span><strong>{rubles(summary.receivedMinor)}</strong></article>
      <article><span>Заработано</span><strong>{rubles(summary.earnedMinor)}</strong></article>
      <article><span>Ожидается</span><strong>{rubles(summary.outstandingMinor)}</strong></article>
      <article><span>Кредиты</span><strong>{rubles(summary.creditMinor)}</strong></article>
    </section>
    <section className="finance-list">
      <header className="finance-table-head"><span>Ученик / контекст</span><span>Модель</span><span>Ожидается</span><span>Получено</span><span>Баланс</span><span>Статус</span><span /></header>
      {rows.map((row) => {
        const isExpanded = row.kind === "INDIVIDUAL" || expanded.has(row.id);
        return <article className="finance-parent" key={row.id} style={{ "--entity-color": row.color } as React.CSSProperties}>
          {row.kind !== "INDIVIDUAL" && <button className="finance-parent-summary" type="button" onClick={() => setExpanded((previous) => { const next = new Set(previous); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })} aria-expanded={isExpanded}>
            <span className="finance-chevron">{isExpanded ? "⌄" : "›"}</span><strong>{row.name}</strong><small>{row.kind === "PAIR" ? "Пара" : `Группа · ${row.participants.length}`}</small>
            <b>{rubles(row.expectedMinor)}</b><b>{rubles(row.receivedMinor)}</b><em className={`payment-status status-${row.status.toLowerCase()}`}>{statusLabels[row.status]}</em>
          </button>}
          {isExpanded && <div className="finance-participants">
            {row.participants.map((item) => <div className="finance-row" key={item.key}>
              <div className="finance-person"><span className="finance-dot" /><div className="entity-meta"><strong className="entity-primary">{item.name}</strong><small className="entity-secondary">{item.contextName}</small></div></div>
              <div><strong>{modelLabels[item.billingModel]}</strong><small>{rubles(item.unitAmountMinor)}{item.kind === "GROUP" ? " · цена участника" : ""}</small></div>
              <div className="finance-value-cell"><strong>{rubles(item.expectedMinor)}</strong><small>{item.calculationNote}</small></div>
              <div className="finance-value-cell"><strong>{rubles(item.receivedMinor)}</strong><small>{item.lastPaymentDate ? `Последний: ${item.lastPaymentDate}` : "Платежей нет"}</small></div>
              <div className="finance-value-cell"><strong className={item.balanceMinor > 0 ? "positive" : item.balanceMinor < 0 ? "negative" : ""}>{item.balanceMinor > 0 ? "+" : ""}{rubles(item.balanceMinor)}</strong>{item.receiptUrl && <a href={item.receiptUrl} target="_blank" rel="noreferrer">Чек ↗</a>}</div>
              <div><span className={`payment-status status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>{item.creditMinor > 0 && <small>Кредит {rubles(item.creditMinor)}</small>}</div>
              <div className="finance-actions"><a className="small-button" href={`?month=${period.key}&add=${encodeURIComponent(item.key)}`}>+ Оплата</a>{item.payments.filter((payment) => !currentPayments.has(payment.id)).map((payment) => <a key={payment.id} className="payment-history-link" href={`?month=${period.key}&editPayment=${payment.id}`} title="Исправить платёж">{payment.date ?? "—"} · {rubles(payment.amountMinor)}</a>)}</div>
            </div>)}
          </div>}
        </article>;
      })}
      {!rows.length && <div className="finance-empty">Платежей пока нет. Добавьте ученика и настройте его оплату.</div>}
    </section>
    {selected && <PaymentSheet participant={selected} period={period} />}
    {editing && <CorrectionSheet participant={editing.item} payment={editing.payment} period={period} />}
  </>;
}

function PaymentSheet({ participant, period }: { participant: FinanceParticipant; period: FinancePeriod }) {
  const calculated = participant.expectedMinor;
  const [suggested, setSuggested] = useState(String(calculated / 100));
  const changed = Math.round(Number(suggested.replace(",", ".")) * 100) !== calculated;
  return <div className="payment-sheet-backdrop"><aside className="payment-sheet" aria-label="Добавить оплату">
    <header><div><small>Новая оплата</small><h2>{participant.name}</h2><span>{participant.contextName}</span></div><a href={`?month=${period.key}`} aria-label="Закрыть">×</a></header>
    <form action={createPayment}>
      <input type="hidden" name="studentId" value={participant.studentId}/><input type="hidden" name="cohortId" value={participant.cohortId ?? ""}/><input type="hidden" name="billingProfileId" value={participant.billingProfileId}/><input type="hidden" name="billingModel" value={participant.billingModel}/>
      <input type="hidden" name="periodLabel" value={period.label}/><input type="hidden" name="periodStart" value={period.start.toISOString().slice(0, 10)}/><input type="hidden" name="periodEnd" value={period.end.toISOString().slice(0, 10)}/><input type="hidden" name="calculatedAmount" value={calculated / 100}/><input type="hidden" name="calculationNote" value={participant.calculationNote}/><input type="hidden" name="creditApplied" value={participant.creditMinor / 100}/>
      <label><span>Период оплаты</span><strong>{period.label}</strong><small>{period.start.toISOString().slice(0, 10)} — {period.end.toISOString().slice(0, 10)}</small></label>
      <label><span>Дата оплаты</span><input required type="date" name="paymentDate" defaultValue={new Date().toISOString().slice(0, 10)}/></label>
      <label><span>Расчётная сумма</span><input name="suggestedAmount" inputMode="decimal" value={suggested} onChange={(event) => setSuggested(event.target.value)}/><small>{participant.calculationNote}</small>{changed && <button className="reset-calculation" type="button" onClick={() => setSuggested(String(calculated / 100))}>Изменено вручную · Вернуть расчётную сумму</button>}</label>
      <label><span>Фактически получено</span><input required name="actualAmount" inputMode="decimal" defaultValue={suggested}/><small>Можно внести часть суммы — следующий платёж сохранится отдельно.</small></label>
      <label><span>Модель оплаты</span><strong>{modelLabels[participant.billingModel]}</strong></label>
      <label><span>Комментарий</span><textarea name="comment" rows={3}/></label>
      <label><span>Ссылка на чек</span><input type="url" name="receiptUrl" placeholder="https://…"/></label>
      <footer><a className="secondary-button" href={`?month=${period.key}`}>Отмена</a><button type="submit">Сохранить оплату</button></footer>
    </form>
  </aside></div>;
}

function CorrectionSheet({ participant, payment, period }: { participant: FinanceParticipant; payment: FinanceParticipant["payments"][number]; period: FinancePeriod }) {
  return <div className="payment-sheet-backdrop"><aside className="payment-sheet"><header><div><small>Коррекция платежа</small><h2>{participant.name}</h2><span>Исходная запись останется в истории</span></div><a href={`?month=${period.key}`}>×</a></header>
    <form action={correctPayment}><input type="hidden" name="paymentId" value={payment.id}/>
      <label><span>Дата оплаты</span><input required type="date" name="paymentDate" defaultValue={payment.date ?? ""}/></label>
      <label><span>Получено</span><input required name="actualAmount" inputMode="decimal" defaultValue={payment.amountMinor / 100}/></label>
      <label><span>Комментарий</span><textarea name="comment" rows={3} defaultValue={payment.comment ?? ""}/></label>
      <label><span>Ссылка на чек</span><input type="url" name="receiptUrl" defaultValue={payment.receiptUrl ?? ""}/></label>
      <footer><a className="secondary-button" href={`?month=${period.key}`}>Отмена</a><button type="submit">Сохранить исправление</button></footer>
    </form>
  </aside></div>;
}
