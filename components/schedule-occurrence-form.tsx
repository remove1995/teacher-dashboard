"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";

export function ScheduleOccurrenceForm({ action, cancelHref, date, startTime, durationMinutes }: { action: (state: ActionState, formData: FormData) => Promise<ActionState>; cancelHref: string; date: string; startTime: string; durationMinutes: number }) {
  const [state,formAction,pending]=useActionState(action,EMPTY_ACTION_STATE);
  return <form action={formAction} className="editor-form"><section className="form-section"><div><h2>Новые дата и время</h2></div><div className="form-grid"><label className="field"><span>Дата</span><input name="date" type="date" required defaultValue={date} disabled={pending}/></label><label className="field"><span>Начало</span><input name="startTime" type="time" required defaultValue={startTime} disabled={pending}/></label><label className="field"><span>Длительность, минут</span><input name="durationMinutes" type="number" min="15" step="5" required defaultValue={durationMinutes} disabled={pending}/></label></div></section>{state.error?<p className="form-error" role="alert">{state.error}</p>:null}<div className="form-actions"><Link className="secondary-button" href={cancelHref}>Отмена</Link><button type="submit" disabled={pending}>{pending?"Переношу…":"Перенести занятие"}</button></div></form>;
}
