import type { BillingModel, StudentStatus } from "@prisma/client";
import Link from "next/link";
import { billingLabels, statusLabels } from "@/lib/format";

type Values = { name: string; imageUrl: string | null; color: string; status: StudentStatus; yearOrLevel: string | null; notesPrivate: string | null; tags: string[]; billing?: { model: BillingModel; amountMinor: number; effectiveFrom: Date } };

export function StudentForm({ action, values }: { action: (formData: FormData) => void | Promise<void>; values?: Values }) {
  return <form action={action} className="editor-form">
    <section className="form-section"><div><p className="eyebrow">Основное</p><h2>Карточка ученика</h2></div><div className="form-grid">
      <label className="field field-wide"><span>Имя</span><input name="name" required defaultValue={values?.name} /></label>
      <label className="field"><span>Статус</span><select name="status" defaultValue={values?.status ?? "ACTIVE"}>{Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Уровень / класс</span><input name="yearOrLevel" defaultValue={values?.yearOrLevel ?? ""} placeholder="Например, B1" /></label>
      <label className="field"><span>Цвет</span><input name="color" type="color" defaultValue={values?.color ?? "#6f8f7a"} /></label>
      <label className="field field-wide"><span>Ссылка на изображение</span><input name="imageUrl" type="url" defaultValue={values?.imageUrl ?? ""} placeholder="Необязательно: обложка, иллюстрация или фото" /><small>Изображение может быть любым удобным визуальным ориентиром — фото ученика не требуется.</small></label>
      <label className="field field-wide"><span>Теги через запятую</span><input name="tags" defaultValue={values?.tags.join(", ")} placeholder="GoGetter, экзамен, разговорный клуб" /></label>
      <label className="field field-wide"><span>Личные заметки</span><textarea name="notesPrivate" rows={4} defaultValue={values?.notesPrivate ?? ""} /></label>
    </div></section>
    <section className="form-section"><div><p className="eyebrow">Условия</p><h2>Индивидуальный биллинг</h2></div><div className="form-grid">
      <label className="field"><span>Модель оплаты</span><select name="billingModel" defaultValue={values?.billing?.model ?? "PAY_PER_LESSON"}>{Object.entries(billingLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Ставка / сумма, ₽</span><input name="rate" type="number" min="0" step="1" required defaultValue={(values?.billing?.amountMinor ?? 250000) / 100} /></label>
      {values?.billing ? <label className="field"><span>Новые условия применять с</span><input name="rateChangeFrom" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /><small>Используется только если ставка или модель оплаты изменились. Предыдущие условия сохранятся в истории.</small></label> : null}
    </div></section>
    <div className="form-actions"><Link className="secondary-button" href="/students">Отмена</Link><button type="submit">Сохранить ученика</button></div>
  </form>;
}
