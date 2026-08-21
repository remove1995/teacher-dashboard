"use client";

import { useMemo, useState } from "react";
import { demoLessons, type DemoEntityKind, type DemoLesson } from "@/lib/demo/data";
import { filterCalendarEvents, layoutOverlaps, monthRange, shiftCalendarFocus, visibleDayBounds, weekRange, type CalendarView } from "@/lib/domain/calendar";

type KindFilter = "ALL" | DemoEntityKind;
type DemoCalendarEvent = DemoLesson & { startMinute: number };

const kinds: Array<[KindFilter, string]> = [["ALL", "Все"], ["INDIVIDUAL", "Индивидуальные"], ["PAIR", "Пары"], ["GROUP", "Группы"]];
const iso = (date: Date) => date.toISOString().slice(0, 10);
const minute = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const dateText = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const statusText = { PLANNED: "Запланирован", COMPLETED: "Завершён" } as const;
const shiftDay = (value: string, amount: number) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return iso(date); };

export function DemoCalendarWorkspace() {
  const [view, setView] = useState<CalendarView>("week");
  const [focus, setFocus] = useState("2026-08-21");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const events = useMemo(() => filterCalendarEvents(demoLessons.map((lesson) => ({ ...lesson, startMinute: minute(lesson.startTime) })), kind), [kind]);
  const week = weekRange(focus);
  const month = monthRange(focus);
  const days = view === "week" ? week.days.map(iso) : Array.from({ length: Math.round((month.gridEnd.getTime() - month.gridStart.getTime()) / 86400000) + 1 }, (_, index) => { const date = new Date(month.gridStart); date.setUTCDate(date.getUTCDate() + index); return iso(date); });
  const visibleEvents = events.filter((event) => days.includes(event.date));
  const selected = events.find(({ id }) => id === selectedId);
  const periodLabel = view === "week"
    ? `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(week.start)} — ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(week.end)}`
    : new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(month.start);

  return <div className="page-stack global-calendar demo-calendar-workspace">
    <header className="page-heading calendar-heading"><h1>Календарь</h1><div className="wrap-actions"><button className="secondary-button" disabled title="Доступно в полной версии">+ Добавить урок</button></div></header>
    <section className="calendar-toolbar">
      <div className="calendar-navigation"><button aria-label="Предыдущий период" onClick={() => setFocus(shiftCalendarFocus(focus, view, -1))}>‹</button><button className="calendar-today" onClick={() => setFocus("2026-08-21")}>Сегодня</button><button aria-label="Следующий период" onClick={() => setFocus(shiftCalendarFocus(focus, view, 1))}>›</button><strong>{periodLabel}</strong></div>
      <nav className="calendar-view-toggle" aria-label="Вид календаря"><button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Неделя</button><button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Месяц</button></nav>
    </section>
    <nav className="calendar-filters" aria-label="Формат занятий">{kinds.map(([value, label]) => <button className={kind === value ? "active" : ""} onClick={() => setKind(value)} key={value}>{label}</button>)}</nav>
    {view === "week" ? <DemoWeek events={visibleEvents} days={days} focus={focus} onFocus={setFocus} onOpen={setSelectedId} /> : <DemoMonth events={visibleEvents} days={days} focus={focus} onOpen={setSelectedId} />}
    {selected ? <div className="calendar-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}><aside className="calendar-sheet" style={{ "--event-color": selected.color } as React.CSSProperties}><header><div><small>{selected.kind === "INDIVIDUAL" ? "Индивидуально" : selected.kind === "PAIR" ? "Пара" : "Группа"}</small><h2>{selected.entityName}</h2><span>{statusText[selected.status]} · просмотр</span></div><button aria-label="Закрыть" onClick={() => setSelectedId(null)}>×</button></header><div className="calendar-sheet-content"><label><span>Тема</span><strong>{selected.title}</strong></label><div className="calendar-relation">{selected.date} · {selected.startTime} · {selected.durationMinutes} минут</div><button disabled title="Доступно в полной версии">Открыть план урока</button><small className="demo-readonly-note">Изменение, перенос и отмена доступны в полной версии.</small></div></aside></div> : null}
  </div>;
}

function DemoWeek({ events, days, focus, onFocus, onOpen }: { events: DemoCalendarEvent[]; days: string[]; focus: string; onFocus: (date: string) => void; onOpen: (id: string) => void }) {
  const bounds = visibleDayBounds(events), height = (bounds.endMinute - bounds.startMinute) * 1.05, overlaps = layoutOverlaps(events);
  const hours = Array.from({ length: (bounds.endMinute - bounds.startMinute) / 60 + 1 }, (_, index) => bounds.startMinute + index * 60);
  return <><section className="calendar-week-desktop" style={{ "--calendar-height": `${height}px` } as React.CSSProperties}><header><span />{days.map((day) => <div className={day === "2026-08-21" ? "today" : ""} key={day}><strong>{dateText(day).split(",")[0]}</strong><span>{dateText(day).split(",")[1]}</span></div>)}</header><div className="calendar-time-axis">{hours.map((hour) => <span key={hour} style={{ top: `${(hour - bounds.startMinute) * 1.05}px` }}>{time(hour)}</span>)}</div>{days.map((day) => <div className={`calendar-day-column ${day === "2026-08-21" ? "today" : ""}`} key={day}>{hours.map((hour) => <i key={hour} style={{ top: `${(hour - bounds.startMinute) * 1.05}px` }} />)}{events.filter((event) => event.date === day).map((event) => { const layout = overlaps.get(event.id)!; return <DemoEvent event={event} onOpen={onOpen} key={event.id} style={{ top: `${(event.startMinute - bounds.startMinute) * 1.05}px`, height: `${Math.max(38, event.durationMinutes * 1.05)}px`, left: `calc(${layout.column / layout.columns * 100}% + 3px)`, width: `calc(${100 / layout.columns}% - 6px)` }} />; })}</div>)}</section><section className="calendar-mobile-day"><header><button onClick={() => onFocus(shiftDay(focus, -1))}>‹</button><div className={focus === "2026-08-21" ? "today" : ""}><strong>{dateText(focus)}</strong><span>{events.filter(({ date }) => date === focus).length} занятий</span></div><button onClick={() => onFocus(shiftDay(focus, 1))}>›</button></header><div>{events.filter(({ date }) => date === focus).map((event) => <DemoEvent event={event} onOpen={onOpen} key={event.id} />)}{!events.some(({ date }) => date === focus) && <p className="calendar-empty-day">Занятий нет.</p>}</div></section></>;
}

function DemoEvent({ event, onOpen, style }: { event: DemoCalendarEvent; onOpen: (id: string) => void; style?: React.CSSProperties }) { return <button onClick={() => onOpen(event.id)} className={`calendar-event calendar-event-${event.status.toLowerCase()}`} style={{ ...style, "--event-color": event.color } as React.CSSProperties}><span className="calendar-event-time"><time>{event.startTime}</time><i>–{time(event.startMinute + event.durationMinutes)}</i></span><strong>{event.entityName}</strong><small>{event.title}</small></button>; }

function DemoMonth({ events, days, focus, onOpen }: { events: DemoCalendarEvent[]; days: string[]; focus: string; onOpen: (id: string) => void }) { return <section className="calendar-month-grid">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <strong className="month-weekday" key={day}>{day}</strong>)}{days.map((day) => { const list = events.filter((event) => event.date === day).sort((a, b) => a.startMinute - b.startMinute); return <article className={`calendar-month-day ${day === "2026-08-21" ? "today" : ""} ${day.slice(0, 7) !== focus.slice(0, 7) ? "is-outside" : ""}`} key={day}><time>{Number(day.slice(-2))}</time><div>{list.slice(0, 3).map((event) => <button onClick={() => onOpen(event.id)} key={event.id} style={{ "--event-color": event.color } as React.CSSProperties} className={`month-event calendar-event-${event.status.toLowerCase()}`}><span>{event.startTime}</span>{event.entityName}</button>)}{list.length > 3 && <small>+{list.length - 3}</small>}</div></article>; })}</section>; }
