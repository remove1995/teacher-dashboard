"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveExtraIncome, deleteExtraIncome } from "@/app/actions/extra-income";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { normalizeIncomeCategory } from "@/lib/domain/extra-income";

export type IncomeRow = { id: string; amountMinor: number; receivedAt: string; title: string; category: string; receiptUrl: string | null; comment: string | null };
type Tag = { id: string; name: string; normalizedName: string };
const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(minor / 100);

export function ExtraIncomeWorkspace({ records, tags, receivedMinor, month, today, add, edit }: { records: IncomeRow[]; tags: Tag[]; receivedMinor: number; month: string; today: string; add: boolean; edit?: string }) {
  const [deleting, setDeleting] = useState<IncomeRow | null>(null);
  useEffect(() => { if (deleting && !records.some((record) => record.id === deleting.id)) setDeleting(null); }, [records, deleting]);
  const selected = records.find((record) => record.id === edit);
  const href = `/payments?tab=other&month=${month}`;
  return <>
    <section className="finance-summary extra-income-summary" aria-label="Другие доходы за месяц"><article><span>Другие доходы за месяц</span><strong>{rubles(receivedMinor)}</strong></article></section>
    <section className="panel extra-income-list">
      {records.length ? <div className="extra-income-table"><table><thead><tr><th>Дата</th><th>Название</th><th>Категория</th><th>Сумма</th><th>Чек</th><th>Комментарий</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}>
        <td><time dateTime={record.receivedAt}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${record.receivedAt}T00:00:00Z`))}</time></td>
        <td>{record.title}</td><td>{record.category}</td><td className="extra-income-money">{rubles(record.amountMinor)}</td><td>{record.receiptUrl ? <a href={record.receiptUrl} target="_blank" rel="noreferrer">Чек ↗</a> : "—"}</td><td>{record.comment ?? "—"}</td>
        <td><div className="extra-income-actions"><Link className="small-button" href={`${href}&editIncome=${record.id}`}>Изменить</Link><button className="secondary-button" type="button" onClick={() => setDeleting(record)}>Удалить</button></div></td>
      </tr>)}</tbody></table></div> : <p className="finance-empty">Других доходов за этот месяц пока нет.</p>}
    </section>
    {(add || selected) && <IncomeSheet key={selected?.id ?? "new"} record={selected} tags={tags} today={today} closeHref={href} />}
    {deleting && <DeleteIncomeDialog key={deleting.id} record={deleting} close={() => setDeleting(null)} />}
  </>;
}

function IncomeSheet({ record, tags, today, closeHref }: { record?: IncomeRow; tags: Tag[]; today: string; closeHref: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveExtraIncome.bind(null, record?.id ?? null), EMPTY_ACTION_STATE);
  const [category, setCategory] = useState(record?.category ?? "");
  const sheet = useRef<HTMLElement>(null);
  useEffect(() => { sheet.current?.focus(); }, []);
  const newCategory = category.trim() && !tags.some((tag) => tag.normalizedName === normalizeIncomeCategory(category));
  return <div className="payment-sheet-backdrop"><aside className="payment-sheet" ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="income-sheet-title" onKeyDown={(event) => { if (event.key === "Escape" && !pending) router.push(closeHref); }}>
    <header><h2 id="income-sheet-title">{record ? "Изменить доход" : "Добавить доход"}</h2><Link href={closeHref} aria-label="Закрыть">×</Link></header>
    <form action={action}>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <label><span>Сумма, ₽</span><input name="amount" type="number" inputMode="decimal" min="0.01" max="21474836.47" step="0.01" required defaultValue={record ? record.amountMinor / 100 : ""} /></label>
      <label><span>Дата получения</span><input name="receivedAt" type="date" required defaultValue={record?.receivedAt ?? today} /></label>
      <label><span>Название</span><input name="title" required maxLength={200} defaultValue={record?.title ?? ""} /></label>
      <label><span>Категория</span><input name="category" list="income-categories" required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} /><datalist id="income-categories">{tags.map((tag) => <option key={tag.id} value={tag.name} />)}</datalist>{newCategory && <small>При сохранении будет создана категория «{category.trim()}»</small>}</label>
      <label><span>Ссылка на чек</span><input name="receiptUrl" type="url" defaultValue={record?.receiptUrl ?? ""} /></label>
      <label><span>Комментарий</span><textarea name="comment" maxLength={5000} defaultValue={record?.comment ?? ""} /></label>
      <footer><Link className="secondary-button" href={closeHref}>Отмена</Link><button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button></footer>
    </form>
  </aside></div>;
}

function DeleteIncomeDialog({ record, close }: { record: IncomeRow; close: () => void }) {
  const [state, action, pending] = useActionState(deleteExtraIncome.bind(null, record.id), EMPTY_ACTION_STATE);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => { dialog.current?.focus(); }, []);
  return <div className="student-lifecycle-backdrop"><section className="student-lifecycle-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="delete-income-title" onKeyDown={(event) => { if (event.key === "Escape" && !pending) close(); }}>
    <h2 id="delete-income-title">Удалить доход «{record.title}»?</h2><p>Будет удалена только эта запись на {rubles(record.amountMinor)}. Это действие нельзя отменить.</p>{state.error && <p className="form-error" role="alert">{state.error}</p>}
    <form action={action}><footer><button className="secondary-button" type="button" onClick={close} disabled={pending}>Отмена</button><button className="danger-button" type="submit" disabled={pending}>{pending ? "Удаляем…" : "Удалить"}</button></footer></form>
  </section></div>;
}
