"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { addLessonStage, addLessonTag, clearLessonPlan, deleteLesson, materializeLesson, moveLessonOnMobile, deleteLessonStage, removeLessonTag, reorderLessonStages, toggleLessonStage, updateLessonDate, updateLessonField, updateLessonStage } from "@/app/actions/lessons";
import { suggestDateInMonth } from "@/lib/domain/lesson";
import { ShareActions } from "@/components/share-actions";

export function ClearLessonPlanButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const clear = () => {
    if (!window.confirm("Очистить план урока? Дата, статус и история урока сохранятся.")) return;
    startTransition(async () => {
      await clearLessonPlan(lessonId);
      router.refresh();
    });
  };
  return <button className="lesson-plan-clear" type="button" aria-label="Очистить план урока" title="Очистить план урока" disabled={pending} onClick={clear}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
  </button>;
}

export function DeleteLessonButton({ lessonId, title, closeHref }: { lessonId: string; title: string; closeHref: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = title.trim() || "Без темы";
  return <button className="lesson-delete-button danger-button" type="button" disabled={pending} onClick={() => {
    if (!window.confirm(`Удалить план «${label}»? Сам урок и связанные с ним данные будут удалены без возможности восстановления.`)) return;
    startTransition(async () => {
      await deleteLesson(lessonId);
      router.replace(closeHref);
      router.refresh();
    });
  }}>{pending ? "Удаляю…" : "Удалить"}</button>;
}

export function EntitySwitcher({ entities, selected }: { entities: Array<{ value: string; label: string; kind: string }>; selected: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  return <label className="entity-switcher"><span>Уроки для</span><select value={selected} onChange={(event) => { const params = new URLSearchParams(searchParams.toString()); params.set("entity", event.target.value); params.delete("lesson"); router.push(`/lessons?${params}`); }}>{entities.map((entity) => <option key={entity.value} value={entity.value}>{entity.label} · {entity.kind}</option>)}</select></label>;
}

export function AutoSaveField({ lessonId, field, value, label, multiline = false, placeholder }: { lessonId: string; field: "title" | "goal" | "homeworkText" | "notes"; value: string | null; label: string; multiline?: boolean; placeholder?: string }) {
  const router = useRouter();
  const initial = useRef(value ?? "");
  const [currentValue,setCurrentValue]=useState(value??"");
  const [pending, startTransition] = useTransition();
  useEffect(()=>{initial.current=value??"";setCurrentValue(value??"");},[value]);
  const save = (next: string) => {
    if (next === initial.current) return;
    const data = new FormData(); data.set("value", next);
    startTransition(async () => { await updateLessonField(lessonId, field, data); initial.current = next; router.refresh(); });
  };
  return <div className={`lesson-inline-field ${multiline ? "is-multiline" : ""}`}><label><span>{label}{pending ? <small>Сохраняю…</small> : null}</span>{multiline ? <textarea value={currentValue} onChange={(event)=>setCurrentValue(event.target.value)} placeholder={placeholder} rows={field === "notes" ? 4 : 3} onBlur={(event) => save(event.currentTarget.value)} /> : <input value={currentValue} onChange={(event)=>setCurrentValue(event.target.value)} placeholder={placeholder} onBlur={(event) => save(event.currentTarget.value)} />}</label>{field === "homeworkText" && <ShareActions title="Домашнее задание" text={currentValue} copyLabel="Скопировать" />}</div>;
}

type Stage = { id: string; text: string; completed: boolean; sortOrder: number };

function StageNameField({ value, onCommit }: { value: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  return <textarea
    ref={textareaRef}
    className="stage-name"
    aria-label="Название этапа"
    rows={1}
    value={draft}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={() => {
      const text = draft.trim();
      if (!text) {
        setDraft(value);
        return;
      }
      if (text !== value) onCommit(text);
    }}
  />;
}

export function StageEditor({ lessonId, initialStages }: { lessonId: string; initialStages: Stage[] }) {
  const router = useRouter();
  const [stages, setStages] = useState([...initialStages].sort((a,b) => a.sortOrder-b.sortOrder));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(()=>setStages([...initialStages].sort((a,b)=>a.sortOrder-b.sortOrder)),[initialStages]);
  const refresh = (task: () => Promise<unknown>) => startTransition(async () => { await task(); router.refresh(); });
  const dropOn = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const next = [...stages]; const from = next.findIndex(({id}) => id === draggedId); const to = next.findIndex(({id}) => id === targetId);
    const [moved] = next.splice(from,1); next.splice(to,0,moved); setStages(next); setDraggedId(null); refresh(() => reorderLessonStages(lessonId, next.map(({id}) => id)));
  };
  return <section className="lesson-panel-section"><div className="lesson-section-heading"><h3>Этапы урока</h3><span>{stages.filter(({completed}) => completed).length}/{stages.length}</span></div><div className={`stage-editor ${pending ? "is-saving" : ""}`}>{stages.map((stage) => <div className="stage-edit-row" onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(stage.id)} key={stage.id}>
    <button className="stage-drag-handle" type="button" draggable aria-label="Перетащить этап" onDragStart={() => setDraggedId(stage.id)} onDragEnd={() => setDraggedId(null)}>⠿</button><input aria-label="Этап завершён" type="checkbox" checked={stage.completed} onChange={(event) => { const completed=event.target.checked; setStages((items) => items.map((item) => item.id===stage.id ? {...item,completed}:item)); refresh(() => toggleLessonStage(stage.id, completed)); }} />
    <StageNameField value={stage.text} onCommit={(text) => { setStages((items)=>items.map((item)=>item.id===stage.id?{...item,text}:item)); const data=new FormData();data.set("text",text);refresh(()=>updateLessonStage(stage.id,data)); }} />
    <button className="icon-button" type="button" aria-label="Удалить этап" onClick={() => { setStages((items)=>items.filter(({id})=>id!==stage.id)); refresh(()=>deleteLessonStage(stage.id)); }}>×</button>
  </div>)}</div><form className="inline-add" action={(data) => { const text=String(data.get("text")??"").trim(); if(!text)return; refresh(()=>addLessonStage(lessonId,data)); (document.activeElement as HTMLElement | null)?.blur(); }}><input name="text" placeholder="Добавить этап" /><button type="submit">Добавить</button></form></section>;
}

export function TagEditor({ lessonId, tags, suggestions }: { lessonId: string; tags: Array<{ id: string; name: string }>; suggestions: string[] }) {
  const router=useRouter(); const [pending,startTransition]=useTransition();
  const run=(task:()=>Promise<unknown>)=>startTransition(async()=>{await task();router.refresh();});
  return <section className="lesson-panel-section"><div className="lesson-section-heading"><h3>Теги</h3>{pending?<span>Сохраняю…</span>:null}</div><div className="editable-tags">{tags.map((tag)=><span key={tag.id}>{tag.name}<button type="button" aria-label={`Удалить ${tag.name}`} onClick={()=>run(()=>removeLessonTag(lessonId,tag.id))}>×</button></span>)}</div><form className="inline-add compact" action={(data)=>run(()=>addLessonTag(lessonId,data))}><input name="name" list="lesson-tag-suggestions" placeholder="Добавить тег" required /><datalist id="lesson-tag-suggestions">{suggestions.map((name)=><option value={name} key={name}/>)}</datalist><button type="submit">+</button></form></section>;
}

export function LessonColorPicker({ lessonId, value, entityColor }: { lessonId: string; value: string | null; entityColor: string }) {
  const router=useRouter(); const [pending,startTransition]=useTransition();
  return <label className="lesson-color-control"><span>Акцентный цвет</span><input type="color" defaultValue={value ?? entityColor} disabled={pending} onChange={(event)=>{const data=new FormData();data.set("value",event.target.value);startTransition(async()=>{await updateLessonField(lessonId,"colorOverride",data);router.refresh();});}} /></label>;
}

export function LessonDateField({ lessonId, value }: { lessonId: string; value: string }) {
  const router=useRouter(); const searchParams=useSearchParams(); const [pending,startTransition]=useTransition();
  return <><label className="lesson-inline-field lesson-date-field"><span>Дата урока{pending?<small>Перемещаю…</small>:null}</span><input type="date" value={value} disabled={pending} onChange={(event)=>{const next=event.target.value;if(!next)return;const data=new FormData();data.set("value",next);startTransition(async()=>{const scheduledDate=await updateLessonDate(lessonId,data);const params=new URLSearchParams(searchParams.toString());params.set("focusMonth",scheduledDate.slice(0,7));router.replace(`/lessons?${params}`);router.refresh();});}} /></label><MobileLessonMove lessonId={lessonId} value={value}/></>;
}

export function MobileLessonMove({lessonId,value}:{lessonId:string;value:string}){const router=useRouter(),searchParams=useSearchParams();const [open,setOpen]=useState(false),[month,setMonth]=useState(value.slice(0,7)),[date,setDate]=useState(value);const [pending,startTransition]=useTransition();if(!open)return <button className="mobile-lesson-move secondary-button" type="button" onClick={()=>setOpen(true)}>Переместить</button>;return <section className="mobile-lesson-move-form"><strong>Переместить урок</strong><div><input aria-label="Месяц назначения" type="month" value={month} onChange={event=>{const next=event.target.value;if(next){setMonth(next);setDate(suggestDateInMonth(date,next))}}}/><input aria-label="Новая дата урока" type="date" value={date} min={`${month}-01`} max={`${month}-${new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate()}`} onChange={event=>setDate(event.target.value)}/></div><footer><button className="secondary-button" type="button" onClick={()=>setOpen(false)}>Отмена</button><button type="button" disabled={pending||!date.startsWith(month)} onClick={()=>startTransition(async()=>{const result=await moveLessonOnMobile(lessonId,date);const params=new URLSearchParams(searchParams.toString());params.set("focusMonth",result.month);router.replace(`/lessons?${params}`);setOpen(false);router.refresh()})}>Переместить</button></footer></section>}

export function ManualLessonCreator({ targetType, targetId, defaultDate, candidate }: { targetType:"student"|"cohort"; targetId:string; defaultDate:string; candidate?:{id:string;scheduledDate:string;startTime:string}|null }) {
  const router=useRouter(); const searchParams=useSearchParams(); const [open,setOpen]=useState(false); const [pending,startTransition]=useTransition();
  if(!open)return <button className="add-month-lesson" type="button" onClick={()=>setOpen(true)}>+ Добавить урок</button>;
  return <form className="manual-lesson-form" action={(data)=>startTransition(async()=>{const lesson=await materializeLesson(targetType,targetId,candidate?.id??null,data);const params=new URLSearchParams(searchParams.toString());params.set("lesson",lesson.id);params.set("focusMonth",lesson.scheduledDate.slice(0,7));router.push(`/lessons?${params}`);router.refresh();})}><input name="title" placeholder="Тема урока" autoFocus/><div><input name="scheduledDate" type="date" required defaultValue={candidate?.scheduledDate??defaultDate}/><input name="startTime" type="time" required defaultValue={candidate?.startTime??"16:00"}/></div><small>{candidate?"Используем ближайшее занятие из расписания — без дубликата.":"Свободного занятия из расписания нет — создадим ручной урок."}</small><footer><button className="secondary-button" type="button" onClick={()=>setOpen(false)}>Отмена</button><button type="submit" disabled={pending}>{pending?"Добавляю…":"Добавить"}</button></footer></form>;
}
