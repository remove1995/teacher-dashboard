"use client";

import type { BillingModel, CohortKind } from "@prisma/client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { billingLabels } from "@/lib/format";

type StudentOption = { id: string; name: string };
type MemberValue = { studentId: string; billing?: { model: BillingModel; amountMinor: number; effectiveFrom: Date } };
type Values = { name: string; kind: CohortKind; imageUrl: string | null; color: string; activeFrom: Date; activeTo: Date | null; defaultRateMinor: number | null; tags: string[]; members: MemberValue[] };
type ParticipantRow = { key: string; mode: "existing" | "new"; studentId: string; name: string; billing?: MemberValue["billing"] };

export function CohortForm({ action, students, values, initialKind, initialMemberIds = [] }: { action: (formData: FormData) => void | Promise<void>; students: StudentOption[]; values?: Values; initialKind: CohortKind; initialMemberIds?: string[] }) {
  const kind = values?.kind ?? initialKind;
  const sequence = useRef(0);
  const initialRows = useMemo(() => {
    const memberMap = new Map(values?.members.map((member) => [member.studentId, member]));
    const ids = values?.members.map(({ studentId }) => studentId) ?? initialMemberIds;
    const rows: ParticipantRow[] = ids.map((studentId, index) => ({ key: `existing-${studentId}-${index}`, mode: "existing", studentId, name: "", billing: memberMap.get(studentId)?.billing }));
    while (rows.length < 2) rows.push({ key: `initial-${rows.length}`, mode: "existing", studentId: "", name: "" });
    return rows;
  }, [initialMemberIds, values?.members]);
  const [participants, setParticipants] = useState(initialRows);
  const selectedIds = new Set(participants.filter(({ mode }) => mode === "existing").map(({ studentId }) => studentId).filter(Boolean));
  const defaultRateMinor = values?.defaultRateMinor ?? (kind === "GROUP" ? 450000 : 200000);
  const addParticipant = () => setParticipants((current) => [...current, { key: `new-slot-${sequence.current++}`, mode: "existing", studentId: "", name: "" }]);
  const updateParticipant = (key: string, patch: Partial<ParticipantRow>) => setParticipants((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));

  return <form action={action} className="editor-form">
    <section className="form-section"><div><p className="eyebrow">Формат</p><h2>{kind === "PAIR" ? "Пара" : "Группа"}</h2></div><div className="form-grid">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="activeFrom" value={values?.activeFrom.toISOString().slice(0,10) ?? new Date().toISOString().slice(0,10)} />
      <input type="hidden" name="activeTo" value={values?.activeTo?.toISOString().slice(0,10) ?? ""} />
      <label className="field field-wide"><span>Название</span><input name="name" required defaultValue={values?.name} placeholder={kind === "PAIR" ? "Пара 1" : "Группа 1"} /></label>
      <label className="field field-wide"><span>Ссылка на изображение</span><input name="imageUrl" type="url" defaultValue={values?.imageUrl ?? ""} placeholder="Необязательно: аватар пары или группы" /><small>Используется в карточке и профиле формата.</small></label>
      <label className="field"><span>Цвет</span><input name="color" type="color" defaultValue={values?.color ?? "#d29b58"} /></label>
      <label className="field"><span>Ставка по умолчанию, ₽</span><input name="defaultRate" type="number" min="0" required defaultValue={defaultRateMinor / 100} /></label>
      <label className="field field-wide"><span>Теги через запятую</span><input name="tags" defaultValue={values?.tags.join(", ")} /></label>
    </div></section>
    <section className="form-section cohort-participants-section"><div className="cohort-participants-heading"><div><p className="eyebrow">Состав и цены</p><h2>Участники</h2><p className="section-help">{kind === "PAIR" ? "Добавьте ровно двух учеников." : "Добавьте минимум двух учеников."} Для каждого можно выбрать существующий профиль или создать новый.</p></div>{kind === "GROUP" ? <button className="secondary-button" type="button" onClick={addParticipant}>+ Добавить ученика</button> : null}</div><div className="member-editor participant-rows">
      {participants.map((participant, index) => <article className="member-row participant-row" key={participant.key}>
        <input type="hidden" name="participantKeys" value={participant.key} />
        <div className="participant-identity-fields">
          <label className="field"><span>Участник {index + 1}</span><select name={`participantMode:${participant.key}`} value={participant.mode} onChange={(event) => updateParticipant(participant.key, { mode: event.target.value as ParticipantRow["mode"], studentId: "", name: "" })}><option value="existing">Существующий ученик</option><option value="new">Новый ученик</option></select></label>
          {participant.mode === "existing" ? <label className="field"><span>Ученик</span><select name={`participantStudentId:${participant.key}`} required value={participant.studentId} onChange={(event) => updateParticipant(participant.key, { studentId: event.target.value })}><option value="">Выберите ученика</option>{students.map((student) => <option value={student.id} key={student.id} disabled={selectedIds.has(student.id) && participant.studentId !== student.id}>{student.name}</option>)}</select></label> : <label className="field"><span>Имя нового ученика</span><input name={`participantName:${participant.key}`} required value={participant.name} onChange={(event) => updateParticipant(participant.key, { name: event.target.value })} placeholder="Имя и фамилия" /></label>}
        </div>
        <label className="field"><span>Модель оплаты</span><select name={`billingModel:${participant.key}`} defaultValue={participant.billing?.model ?? (kind === "GROUP" ? "GROUP_SUBSCRIPTION" : "PAY_PER_LESSON")}>{Object.entries(billingLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>Цена, ₽</span><input name={`rate:${participant.key}`} type="number" min="0" required defaultValue={(participant.billing?.amountMinor ?? defaultRateMinor) / 100} /></label>
        {participant.billing ? <label className="field participant-rate-date"><span>Новые условия с</span><input name={`rateChangeFrom:${participant.key}`} type="date" defaultValue={new Date().toISOString().slice(0,10)} /><small>Только при изменении цены или модели.</small></label> : <div className="member-billing-note">Начало тарифа — автоматически</div>}
        {kind === "GROUP" && participants.length > 2 ? <button className="participant-remove" type="button" aria-label={`Удалить участника ${index + 1}`} title="Удалить участника" onClick={() => setParticipants((current) => current.filter(({ key }) => key !== participant.key))}>×</button> : null}
      </article>)}
    </div></section>
    <div className="form-actions"><Link className="secondary-button" href="/students">Отмена</Link><button type="submit">Сохранить {kind === "PAIR" ? "пару" : "группу"}</button></div>
  </form>;
}
