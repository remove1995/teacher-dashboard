"use client";

import Link from "next/link";
import { cancelCalendarLesson, createCalendarLesson, rescheduleCalendarLesson, updateCalendarOccurrence } from "@/app/actions/calendar";
import { layoutOverlaps, visibleDayBounds, type CalendarKind, type CalendarView } from "@/lib/domain/calendar";

export type CalendarEvent = { id:string;date:string;startMinute:number;durationMinutes:number;title:string;status:"PLANNED"|"COMPLETED"|"CANCELLED"|"RESCHEDULED";kind:CalendarKind;entityName:string;color:string;studentId:string|null;cohortId:string|null;recurringScheduleId:string|null;originalLessonId:string|null;replacementLessonId:string|null;manuallyEdited:boolean };
type Target = { value:string;name:string;kind:CalendarKind };
type Props = { events:CalendarEvent[];days:string[];view:CalendarView;focus:string;today:string;selected?:CalendarEvent;addOpen:boolean;targets:Target[];baseQuery:string };

const time=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;
const dateText=(value:string)=>new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",weekday:"short",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
const statusText={PLANNED:"Запланирован",COMPLETED:"Завершён",CANCELLED:"Отменён",RESCHEDULED:"Перенесён"};

export function CalendarWorkspace(props:Props){
  return <>
    {props.view==="week"?<WeekView {...props}/>:<MonthView {...props}/>} 
    {props.selected&&<LessonSheet lesson={props.selected} focus={props.focus} view={props.view}/>} 
    {props.addOpen&&<AddLessonSheet targets={props.targets} focus={props.focus} view={props.view}/>} 
  </>;
}

function WeekView({events,days,today,focus,baseQuery}:Props){
  const bounds=visibleDayBounds(events),height=(bounds.endMinute-bounds.startMinute)*1.05;
  const overlaps=layoutOverlaps(events);
  const hours=Array.from({length:(bounds.endMinute-bounds.startMinute)/60+1},(_,i)=>bounds.startMinute+i*60);
  return <>
    <section className="calendar-week-desktop" style={{"--calendar-height":`${height}px`} as React.CSSProperties}>
      <header><span/><>{days.map(day=><div className={day===today?"today":""} key={day}><strong>{dateText(day).split(",")[0]}</strong><span>{dateText(day).split(",")[1]}</span></div>)}</></header>
      <div className="calendar-time-axis">{hours.map(hour=><span key={hour} style={{top:`${(hour-bounds.startMinute)*1.05}px`}}>{time(hour)}</span>)}</div>
      {days.map(day=><div className={`calendar-day-column ${day===today?"today":""}`} key={day}>{hours.map(hour=><i key={hour} style={{top:`${(hour-bounds.startMinute)*1.05}px`}}/>)}{events.filter(event=>event.date===day).map(event=>{const layout=overlaps.get(event.id)!;return <EventBlock key={event.id} event={event} style={{top:`${(event.startMinute-bounds.startMinute)*1.05}px`,height:`${Math.max(38,event.durationMinutes*1.05)}px`,left:`calc(${layout.column/layout.columns*100}% + 3px)`,width:`calc(${100/layout.columns}% - 6px)`}} conflict={layout.conflict}/>})}</div>)}
    </section>
    <MobileDay events={events} days={days} focus={focus} today={today} baseQuery={baseQuery}/>
  </>;
}

function EventBlock({event,style,conflict}:{event:CalendarEvent;style?:React.CSSProperties;conflict?:boolean}){return <Link href={`?view=week&date=${event.date}&lesson=${event.id}`} className={`calendar-event calendar-event-${event.status.toLowerCase()} ${conflict?"has-conflict":""}`} style={{...style,"--event-color":event.color} as React.CSSProperties}><span className="calendar-event-time"><time>{time(event.startMinute)}</time><i>–{time(event.startMinute+event.durationMinutes)}</i></span><strong>{event.entityName}</strong>{event.title&&!event.title.startsWith("Урок ·")&&<small>{event.title}</small>}</Link>}

function MobileDay({events,days,focus,today,baseQuery}:{events:CalendarEvent[];days:string[];focus:string;today:string;baseQuery:string}){
  const active=days.includes(focus)?focus:days[0];const date=new Date(`${active}T00:00:00Z`);const prev=new Date(date);prev.setUTCDate(prev.getUTCDate()-1);const next=new Date(date);next.setUTCDate(next.getUTCDate()+1);
  const list=events.filter(event=>event.date===active).sort((a,b)=>a.startMinute-b.startMinute);
  return <section className="calendar-mobile-day"><header><Link href={`?${baseQuery}&date=${prev.toISOString().slice(0,10)}`}>‹</Link><div className={active===today?"today":""}><strong>{dateText(active)}</strong><span>{list.length} занятий</span></div><Link href={`?${baseQuery}&date=${next.toISOString().slice(0,10)}`}>›</Link></header><div>{list.map(event=><EventBlock key={event.id} event={event}/>)}{!list.length&&<p className="calendar-empty-day">Занятий нет.</p>}</div></section>
}

function MonthView({events,days,today}:Props){return <section className="calendar-month-grid">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(day=><strong className="month-weekday" key={day}>{day}</strong>)}{days.map(day=>{const list=events.filter(event=>event.date===day).sort((a,b)=>a.startMinute-b.startMinute);return <article className={`calendar-month-day ${day===today?"today":""}`} key={day}><time>{Number(day.slice(-2))}</time><div>{list.slice(0,3).map(event=><Link key={event.id} href={`?view=month&date=${day}&lesson=${event.id}`} style={{"--event-color":event.color} as React.CSSProperties} className={`month-event calendar-event-${event.status.toLowerCase()}`}><span>{time(event.startMinute)}</span>{event.entityName}</Link>)}{list.length>3&&<small>+{list.length-3}</small>}</div></article>})}</section>}

function LessonSheet({lesson,focus,view}:{lesson:CalendarEvent;focus:string;view:CalendarView}){
  const close=`?view=${view}&date=${focus}`; const canEdit=lesson.status==="PLANNED";
  return <div className="calendar-sheet-backdrop"><aside className="calendar-sheet" style={{"--event-color":lesson.color} as React.CSSProperties}><header><div><small>{lesson.kind==="INDIVIDUAL"?"Индивидуально":lesson.kind==="PAIR"?"Пара":"Группа"}</small><h2>{lesson.entityName}</h2><span>{statusText[lesson.status]}{lesson.manuallyEdited?" · изменён вручную":""}</span></div><Link href={close}>×</Link></header><div className="calendar-sheet-content"><label><span>Тема</span><strong>{lesson.title||"Без темы"}</strong></label><form action={updateCalendarOccurrence.bind(null,lesson.id)}><h3>Только это занятие</h3><div className="calendar-inline-fields"><label><span>Дата</span><input name="date" type="date" required defaultValue={lesson.date} disabled={!canEdit}/></label><label><span>Начало</span><input name="startTime" type="time" required defaultValue={time(lesson.startMinute)} disabled={!canEdit}/></label><label><span>Минут</span><input name="durationMinutes" type="number" min="15" step="5" required defaultValue={lesson.durationMinutes} disabled={!canEdit}/></label></div>{canEdit&&<button>Сохранить время</button>}</form>{canEdit&&<form action={rescheduleCalendarLesson.bind(null,lesson.id)} className="calendar-reschedule"><h3>Перенести с сохранением истории</h3><div className="calendar-inline-fields"><label><span>Новая дата</span><input name="date" type="date" required defaultValue={lesson.date}/></label><label><span>Начало</span><input name="startTime" type="time" required defaultValue={time(lesson.startMinute)}/></label><label><span>Минут</span><input name="durationMinutes" type="number" min="15" step="5" required defaultValue={lesson.durationMinutes}/></label></div><button className="secondary-button">Перенести</button></form>}{lesson.recurringScheduleId&&<Link className="calendar-series-link" href={`/schedules/${lesson.recurringScheduleId}/edit`}>Изменить это и все будущие →</Link>}{lesson.originalLessonId&&<p className="calendar-relation">Это замена перенесённого занятия.</p>}{lesson.replacementLessonId&&<p className="calendar-relation">Новое занятие связано с этой записью и показано в фактическую дату.</p>}<Link className="button" href={`/lessons?entity=${lesson.studentId?`student:${lesson.studentId}`:`cohort:${lesson.cohortId}`}&lesson=${lesson.id}`}>Открыть план урока</Link>{canEdit&&<form action={cancelCalendarLesson.bind(null,lesson.id)}><button className="danger-button">Отменить занятие</button></form>}</div></aside></div>
}

function AddLessonSheet({targets,focus,view}:{targets:Target[];focus:string;view:CalendarView}){return <div className="calendar-sheet-backdrop"><aside className="calendar-sheet"><header><div><small>Разовое занятие</small><h2>Добавить урок</h2></div><Link href={`?view=${view}&date=${focus}`}>×</Link></header><div className="calendar-sheet-content"><form action={createCalendarLesson}><label><span>Ученик / пара / группа</span><select name="target" required>{targets.map(target=><option key={target.value} value={target.value}>{target.name} · {target.kind==="INDIVIDUAL"?"индивидуально":target.kind==="PAIR"?"пара":"группа"}</option>)}</select></label><div className="calendar-inline-fields"><label><span>Дата</span><input name="date" type="date" required defaultValue={focus}/></label><label><span>Начало</span><input name="startTime" type="time" required defaultValue="16:00"/></label><label><span>Минут</span><input name="durationMinutes" type="number" min="15" step="5" required defaultValue="60"/></label></div><label><span>Тема, необязательно</span><input name="title" placeholder="Новый урок"/></label><button>Создать урок</button></form><details className="calendar-new-series"><summary>Новое регулярное расписание</summary>{targets.map(target=><Link key={target.value} href={`/schedules/new?${target.value.replace(":","Id=")}`}>{target.name}</Link>)}</details></div></aside></div>}
