"use client";

import { useMemo, useState } from "react";
import { demoAttendance, demoCohorts, demoLessons, demoStudentById } from "@/lib/demo/data";
import { attendanceStatusMark, cohortAttendanceCell, filterAttendanceRows, individualAttendanceCell, journalDates, monthlyAttendanceTotal, participantBreakdown, type AttendanceStatus, type JournalLesson, type JournalRow } from "@/lib/domain/attendance";

type Format = "all" | "individual" | "pair" | "group";
const labels: Record<AttendanceStatus, string> = { PRESENT: "Присутствовал", ABSENT: "Отсутствовал", RESCHEDULED: "Перенесён", CANCELLED: "Отменён", PLANNED: "Не отмечено" };
const formats: Array<[Format, string]> = [["all", "Все"], ["individual", "Индивидуальные"], ["pair", "Пары"], ["group", "Группы"]];
const shortDate = (date: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const shiftMonth = (month: string, amount: number) => { const [year, value] = month.split("-").map(Number); return new Date(Date.UTC(year, value - 1 + amount, 1)).toISOString().slice(0, 7); };

function allRows(): JournalRow[] {
  const rows = new Map<string, JournalRow>();
  for (const lesson of demoLessons) {
    const participants = lesson.studentIds.map((studentId) => ({ studentId, name: demoStudentById(studentId)?.name ?? studentId, status: (demoAttendance.find((entry) => entry.lessonId === lesson.id && entry.studentId === studentId)?.status ?? "PLANNED") as AttendanceStatus }));
    const id = lesson.kind === "INDIVIDUAL" ? `student:${lesson.studentIds[0]}` : `cohort:${demoCohorts.find((cohort) => cohort.name === lesson.entityName)?.id ?? lesson.entityName}`;
    const row = rows.get(id) ?? { id, name: lesson.entityName, format: lesson.kind, lessons: [] };
    row.lessons.push({ id: lesson.id, date: lesson.date, status: lesson.status, participants });
    rows.set(id, row);
  }
  return [...rows.values()];
}

export function DemoAttendanceWorkspace() {
  const [month, setMonth] = useState("2026-08");
  const [format, setFormat] = useState<Format>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ row: JournalRow; lesson: JournalLesson } | null>(null);
  const rows = useMemo(() => filterAttendanceRows(allRows().map((row) => ({ ...row, lessons: row.lessons.filter(({ date }) => date.startsWith(month)) })).filter((row) => row.lessons.length), format === "all" ? "ALL" : format.toUpperCase() as "INDIVIDUAL" | "PAIR" | "GROUP", query), [month, format, query]);
  const dates = journalDates(rows);
  const label = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  return <div className="attendance-workspace page-stack demo-attendance-workspace"><section className="page-heading attendance-heading"><div><h1>Посещаемость</h1></div></section><section className="attendance-controls"><div className="attendance-month-control"><button aria-label="Предыдущий месяц" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button><label><span>Месяц</span><strong>{label}</strong></label><button aria-label="Следующий месяц" onClick={() => setMonth(shiftMonth(month, 1))}>›</button></div><nav className="attendance-filters" aria-label="Формат занятий">{formats.map(([key, text]) => <button className={format === key ? "active" : ""} onClick={() => setFormat(key)} key={key}>{text}</button>)}</nav><div className="attendance-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ученик, пара или группа" aria-label="Поиск" /><button type="button" disabled title="Поиск применяется автоматически">Найти</button></div></section>{rows.length ? <><section className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th>Ученик / группа</th>{dates.map((date) => <th key={date}>{shortDate(date)}</th>)}<th>Итого</th></tr></thead><tbody>{rows.map((row) => <DemoRow row={row} dates={dates} onOpen={(lesson) => setSelected({ row, lesson })} key={row.id} />)}</tbody></table></section><section className="attendance-mobile-list">{rows.map((row) => { const total = monthlyAttendanceTotal(row.lessons); return <article className="attendance-mobile-card" key={row.id}><header><div><strong>{row.name}</strong><span>{formatName(row.format)}</span></div><b>{total.present}/{total.expected}</b></header><div>{row.lessons.map((lesson) => <div className="attendance-mobile-entry" key={lesson.id}><time>{shortDate(lesson.date)}</time><DemoCell row={row} lesson={lesson} onOpen={() => setSelected({ row, lesson })} /></div>)}</div></article>; })}</section></> : <section className="panel attendance-empty-state"><h2>Нет занятий</h2><p>В этом месяце для выбранного фильтра уроков нет.</p></section>}{selected ? <div className="attendance-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="attendance-dialog" role="dialog" aria-modal="true"><header><div><strong>{selected.row.name}</strong><span>{shortDate(selected.lesson.date)} · просмотр</span></div><button aria-label="Закрыть" onClick={() => setSelected(null)}>×</button></header><div>{participantBreakdown(selected.lesson).map((participant) => <label key={participant.studentId}><span>{participant.name}</span><select value={participant.status} disabled aria-label={`Посещаемость: ${participant.name}`}><option value={participant.status}>{labels[participant.status]}</option></select></label>)}</div><small className="demo-readonly-note">Изменение отметок доступно в полной версии.</small></section></div> : null}</div>;
}

function formatName(format: JournalRow["format"]) { return format === "INDIVIDUAL" ? "Индивидуально" : format === "PAIR" ? "Пара" : "Группа"; }
function DemoRow({ row, dates, onOpen }: { row: JournalRow; dates: string[]; onOpen: (lesson: JournalLesson) => void }) { const total = monthlyAttendanceTotal(row.lessons); return <tr><th><strong>{row.name}</strong><span>{formatName(row.format)}</span></th>{dates.map((date) => <td key={date}><DemoCell row={row} lesson={row.lessons.find((lesson) => lesson.date === date)} onOpen={() => { const lesson = row.lessons.find((item) => item.date === date); if (lesson) onOpen(lesson); }} /></td>)}<td className="attendance-total">{total.present}/{total.expected}</td></tr>; }
function DemoCell({ row, lesson, onOpen }: { row: JournalRow; lesson?: JournalLesson; onOpen: () => void }) { if (!lesson) return <span className="attendance-empty">·</span>; if (row.format === "INDIVIDUAL") { const status = individualAttendanceCell(lesson); return <button className={`attendance-value status-${status.toLowerCase()}`} title={`${labels[status]} · только просмотр`} onClick={onOpen}>{attendanceStatusMark(status)}</button>; } if (lesson.status !== "COMPLETED") return <button className="attendance-value status-planned" title="Не отмечено · только просмотр" onClick={onOpen}>{attendanceStatusMark("PLANNED")}</button>; const total = cohortAttendanceCell(lesson); return <button className={`attendance-ratio ${total.present === total.expected ? "complete" : "partial"}`} title="Только просмотр" onClick={onOpen}>{total.present}/{total.expected}</button>; }
