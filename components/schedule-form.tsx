"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import type { WeeklySlot } from "@/lib/domain/schedule";
import { minuteToTime } from "@/lib/domain/dates";

const weekdays = [[1,"Пн"],[2,"Вт"],[3,"Ср"],[4,"Чт"],[5,"Пт"],[6,"Сб"],[0,"Вс"]] as const;
type Values = { effectiveFrom: Date; effectiveTo: Date | null; timezone: string; slots: WeeklySlot[] };

export function ScheduleForm({ action, target, values, mode, defaultTimezone = "Europe/Moscow", defaultDurationMinutes = 60 }: { action: (state: ActionState, formData: FormData) => Promise<ActionState>; target?: { type: "student" | "cohort"; id: string }; values?: Values; mode: "create" | "future"; defaultTimezone?: string; defaultDurationMinutes?: number }) {
  const slotByWeekday = new Map(values?.slots.map((slot) => [slot.weekday, slot]));
  const [state,formAction,pending]=useActionState(action,EMPTY_ACTION_STATE);
  const today=new Date().toISOString().slice(0,10);
  const futureStart=values?.effectiveFrom.toISOString().slice(0,10) && values.effectiveFrom.toISOString().slice(0,10)>today ? values.effectiveFrom.toISOString().slice(0,10) : today;
  return <form action={formAction} className="editor-form schedule-editor-form">
    {target ? <><input type="hidden" name="targetType" value={target.type} /><input type="hidden" name="targetId" value={target.id} /></> : null}
    <section className="form-section"><div><p className="eyebrow">Повторение</p><h2>{mode === "create" ? "Новое расписание" : "Это и все будущие занятия"}</h2>{mode === "future" ? <p className="section-help">Прошлые и вручную изменённые будущие уроки останутся без изменений.</p> : null}</div><div className="form-grid">
      {mode === "future" ? <label className="field"><span>Новое расписание действует с</span><input name="effectiveFrom" type="date" required defaultValue={futureStart} /></label> : null}
      <fieldset className="field field-wide"><legend>Дни и время</legend><div className="schedule-slot-editor">{weekdays.map(([value,label]) => { const slot = slotByWeekday.get(value); return <div className="schedule-slot-row" key={value}>
        <label className="day-toggle"><input type="checkbox" name="weekdays" value={value} defaultChecked={Boolean(slot)} /><strong>{label}</strong></label>
        <label className="compact-control"><span>Начало</span><input name={`startTime:${value}`} type="time" defaultValue={minuteToTime(slot?.startMinute ?? 960)} /></label>
        <label className="compact-control"><span>Минут</span><input name={`durationMinutes:${value}`} type="number" min="15" step="5" defaultValue={slot?.durationMinutes ?? defaultDurationMinutes} /></label>
      </div>; })}</div></fieldset>
      {mode === "create" ? <label className="field"><span>Действует с</span><input name="effectiveFrom" type="date" required defaultValue={values?.effectiveFrom.toISOString().slice(0,10) ?? today} /></label> : null}
      <label className="field"><span>Действует до</span><input name="effectiveTo" type="date" required defaultValue={values?.effectiveTo?.toISOString().slice(0,10) ?? `${new Date().getFullYear()+1}-05-31`} /></label>
      <label className="field field-wide"><span>Часовой пояс</span><input name="timezone" required defaultValue={values?.timezone ?? defaultTimezone} /></label>
    </div></section>
    {state.error?<p className="form-error" role="alert">{state.error}</p>:null}<div className="form-actions"><Link className="secondary-button" href="/students">Отмена</Link><button type="submit" disabled={pending}>{pending?"Сохраняю…":mode === "create" ? "Создать и сгенерировать уроки" : "Применить к будущим"}</button></div>
  </form>;
}
