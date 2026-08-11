import type { BillingModel, CohortKind } from "@prisma/client";
import Link from "next/link";
import { billingLabels } from "@/lib/format";

type StudentOption = { id: string; name: string };
type MemberValue = { studentId: string; billing?: { model: BillingModel; amountMinor: number; effectiveFrom: Date } };
type Values = { name: string; kind: CohortKind; color: string; activeFrom: Date; activeTo: Date | null; defaultRateMinor: number | null; tags: string[]; members: MemberValue[] };

export function CohortForm({ action, students, values, initialKind }: { action: (formData: FormData) => void | Promise<void>; students: StudentOption[]; values?: Values; initialKind: CohortKind }) {
  const kind = values?.kind ?? initialKind;
  const memberMap = new Map(values?.members.map((member) => [member.studentId, member]));
  return <form action={action} className="editor-form">
    <section className="form-section"><div><p className="eyebrow">Формат</p><h2>{kind === "PAIR" ? "Пара" : "Группа"}</h2></div><div className="form-grid">
      <input type="hidden" name="kind" value={kind} />
      <label className="field field-wide"><span>Название</span><input name="name" required defaultValue={values?.name} placeholder={kind === "PAIR" ? "Адам / Даниэль" : "GoGetter Group"} /></label>
      <label className="field"><span>Цвет</span><input name="color" type="color" defaultValue={values?.color ?? "#d29b58"} /></label>
      <label className="field"><span>Начало</span><input name="activeFrom" type="date" required defaultValue={values?.activeFrom.toISOString().slice(0,10) ?? new Date().toISOString().slice(0,10)} /></label>
      <label className="field"><span>Окончание</span><input name="activeTo" type="date" defaultValue={values?.activeTo?.toISOString().slice(0,10) ?? ""} /></label>
      <label className="field"><span>Ставка по умолчанию, ₽</span><input name="defaultRate" type="number" min="0" required defaultValue={(values?.defaultRateMinor ?? (kind === "GROUP" ? 450000 : 200000)) / 100} /></label>
      <label className="field field-wide"><span>Теги через запятую</span><input name="tags" defaultValue={values?.tags.join(", ")} /></label>
    </div></section>
    <section className="form-section"><div><p className="eyebrow">Состав и цены</p><h2>Участники</h2><p className="section-help">{kind === "PAIR" ? "Выберите ровно двух учеников." : "Выберите минимум двух учеников."} Оплата задаётся для каждого участника отдельно.</p></div><div className="member-editor">
      {students.map((student) => { const member = memberMap.get(student.id); return <article className="member-row" key={student.id}>
        <label className="member-toggle"><input type="checkbox" name="memberIds" value={student.id} defaultChecked={Boolean(member)} /><strong>{student.name}</strong></label>
        <label className="field"><span>Модель оплаты</span><select name={`billingModel:${student.id}`} defaultValue={member?.billing?.model ?? (kind === "GROUP" ? "GROUP_SUBSCRIPTION" : "PAY_PER_LESSON")}>{Object.entries(billingLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>Цена, ₽</span><input name={`rate:${student.id}`} type="number" min="0" defaultValue={(member?.billing?.amountMinor ?? values?.defaultRateMinor ?? (kind === "GROUP" ? 450000 : 200000)) / 100} /></label>
        {member?.billing ? <label className="field"><span>Новые условия с</span><input name={`rateChangeFrom:${student.id}`} type="date" defaultValue={new Date().toISOString().slice(0,10)} /><small>Только при изменении цены или модели.</small></label> : <div className="member-billing-note">Начало тарифа установится автоматически.</div>}
      </article>; })}
    </div></section>
    <div className="form-actions"><Link className="secondary-button" href="/students">Отмена</Link><button type="submit">Сохранить {kind === "PAIR" ? "пару" : "группу"}</button></div>
  </form>;
}
