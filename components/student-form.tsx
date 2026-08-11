import type { BillingModel, CohortKind, StudentStatus } from "@prisma/client";
import Link from "next/link";
import { billingLabels, statusLabels } from "@/lib/format";

type BillingValue = { model: BillingModel; amountMinor: number; effectiveFrom: Date };
type CohortOption = { id: string; name: string; kind: CohortKind; defaultRateMinor: number | null };
type MembershipValue = { cohortId: string; activeFrom: Date; activeTo: Date | null; billing?: BillingValue };
type Values = {
  id: string; name: string; imageUrl: string | null; color: string; status: StudentStatus; yearOrLevel: string | null;
  notesPrivate: string | null; tags: string[]; individualBilling?: BillingValue; memberships: MembershipValue[];
};

const today = new Date().toISOString().slice(0, 10);

export function StudentForm({ action, values, cohorts }: {
  action: (formData: FormData) => void | Promise<void>; values?: Values; cohorts: CohortOption[];
}) {
  const activeMemberships = new Map(values?.memberships.filter((membership) => !membership.activeTo || membership.activeTo >= new Date(today)).map((membership) => [membership.cohortId, membership]));
  const endedMemberships = values?.memberships.filter((membership) => membership.activeTo && membership.activeTo < new Date(today)) ?? [];
  return <form action={action} className="editor-form">
    <section className="form-section"><div><p className="eyebrow">Основное</p><h2>Карточка ученика</h2></div><div className="form-grid">
      <label className="field field-wide"><span>Имя</span><input name="name" required defaultValue={values?.name} /></label>
      <label className="field"><span>Статус</span><select name="status" defaultValue={values?.status ?? "ACTIVE"}>{Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Уровень / класс</span><input name="yearOrLevel" defaultValue={values?.yearOrLevel ?? ""} placeholder="Например, B1" /></label>
      <label className="field"><span>Цвет</span><input name="color" type="color" defaultValue={values?.color ?? "#6f8f7a"} /></label>
      <label className="field field-wide"><span>Ссылка на изображение</span><input name="imageUrl" type="url" defaultValue={values?.imageUrl ?? ""} placeholder="Необязательно: обложка, иллюстрация или фото" /><small>Можно использовать любой удобный визуальный ориентир — фотография ученика не обязательна.</small></label>
      <label className="field field-wide"><span>Теги через запятую</span><input name="tags" defaultValue={values?.tags.join(", ")} placeholder="GoGetter, экзамен, разговорный клуб" /></label>
      <label className="field field-wide"><span>Личные заметки</span><textarea name="notesPrivate" rows={4} defaultValue={values?.notesPrivate ?? ""} /></label>
    </div></section>

    <section className="form-section learning-context-section"><div><p className="eyebrow">Формат обучения</p><h2>Активные контексты</h2><p className="section-help">Можно одновременно заниматься индивидуально и состоять в паре или группе.</p>{values && <label className="field context-effective-date"><span>Изменения действуют с</span><input name="contextEffectiveFrom" type="date" defaultValue={today}/><small>Снятые отметки завершат участие днём ранее, сохранив историю.</small></label>}</div><div className="learning-context-list">
      <ContextCard title="Индивидуально" subtitle="Отдельные уроки и собственный профиль оплаты" checked={Boolean(values?.individualBilling) || !values} name="individualEnabled">
        <BillingFields prefix="individual" billing={values?.individualBilling} defaultModel="PAY_PER_LESSON" defaultRateMinor={250000}/>
      </ContextCard>
      {(["PAIR", "GROUP"] as const).map((kind) => <div className="context-group" key={kind}>
        <header><div><strong>{kind === "PAIR" ? "Пара" : "Группа"}</strong><small>Выберите один или несколько существующих вариантов.</small></div><Link href={`/cohorts/new?kind=${kind}${values ? `&memberId=${values.id}` : ""}`}>Создать {kind === "PAIR" ? "пару" : "группу"} ↗</Link></header>
        {cohorts.filter((cohort) => cohort.kind === kind).map((cohort) => {
          const membership = activeMemberships.get(cohort.id);
          return <ContextCard key={cohort.id} title={cohort.name} subtitle={kind === "PAIR" ? "Пара" : "Группа"} checked={Boolean(membership)} name="contextCohortIds" value={cohort.id}>
            <BillingFields prefix={`cohort:${cohort.id}`} billing={membership?.billing} defaultModel={kind === "GROUP" ? "GROUP_SUBSCRIPTION" : "PAY_PER_LESSON"} defaultRateMinor={cohort.defaultRateMinor ?? (kind === "GROUP" ? 450000 : 200000)}/>
          </ContextCard>;
        })}
        {!cohorts.some((cohort) => cohort.kind === kind) && <p className="context-empty">Пока нет доступных {kind === "PAIR" ? "пар" : "групп"}.</p>}
      </div>)}
      {endedMemberships.length > 0 && <details className="ended-contexts"><summary>Завершённые участия · {endedMemberships.length}</summary>{endedMemberships.map((membership) => { const cohort = cohorts.find((item) => item.id === membership.cohortId); return <p key={`${membership.cohortId}:${membership.activeFrom.toISOString()}`}>{cohort?.name ?? "Удалённый контекст"} · до {membership.activeTo?.toLocaleDateString("ru-RU")}</p>; })}</details>}
    </div></section>
    <div className="form-actions"><Link className="secondary-button" href="/students">Отмена</Link><button type="submit">Сохранить ученика</button></div>
  </form>;
}

function ContextCard({ title, subtitle, checked, name, value = "on", children }: { title: string; subtitle: string; checked: boolean; name: string; value?: string; children: React.ReactNode }) {
  return <article className="learning-context-card"><label className="learning-context-toggle"><input type="checkbox" name={name} value={value} defaultChecked={checked}/><span><strong>{title}</strong><small>{subtitle}</small></span></label><div className="context-billing">{children}</div></article>;
}

function BillingFields({ prefix, billing, defaultModel, defaultRateMinor }: { prefix: string; billing?: BillingValue; defaultModel: BillingModel; defaultRateMinor: number }) {
  return <><label className="field"><span>Модель оплаты</span><select name={`billingModel:${prefix}`} defaultValue={billing?.model ?? defaultModel}>{Object.entries(billingLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field"><span>Ставка / сумма, ₽</span><input name={`rate:${prefix}`} type="number" min="0" step="1" defaultValue={(billing?.amountMinor ?? defaultRateMinor) / 100}/></label></>;
}
