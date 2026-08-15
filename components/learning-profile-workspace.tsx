"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createLearningProfileEntry, deleteLearningProfileEntry, updateLearningProfileEntry } from "@/app/actions/learning";
import { ShareActions } from "@/components/share-actions";
import { searchLearningEntries, sortLearningEntries, type LearningEntry, type LearningEntryType } from "@/lib/domain/learning";
import { availableReportSections, currentMonthPeriod, currentWeekPeriod, customReportPeriod, entriesInReportPeriod, generateLearningReport, type ReportSection } from "@/lib/domain/learning-report";

type SourceOption = { id: string; date: string; title: string; entityKey: string; contextName: string | null };
const types: Array<{ value: "ALL" | LearningEntryType; label: string; add: string }> = [
  { value: "ALL", label: "Все", add: "+ Добавить запись" },
  { value: "VOCABULARY", label: "Vocabulary", add: "+ Добавить лексику" },
  { value: "GRAMMAR_FUNCTION", label: "Grammar / Functions", add: "+ Добавить грамматику / функцию" },
  { value: "NOTE", label: "Teacher Notes", add: "+ Добавить наблюдение" },
  { value: "TEST", label: "Tests", add: "+ Добавить результат" },
];
const labels: Record<LearningEntryType, string> = { VOCABULARY: "Лексика", GRAMMAR_FUNCTION: "Грамматика / функции", NOTE: "Наблюдение", TEST: "Тест / checkpoint" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function LearningProfileWorkspace({ studentId, studentName, entries, lessons, activeType, addType, editKey }: { studentId: string; studentName: string; entries: LearningEntry[]; lessons: SourceOption[]; activeType: "ALL" | LearningEntryType; addType?: LearningEntryType; editKey?: string }) {
  const [query, setQuery] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const visible = useMemo(() => sortLearningEntries(searchLearningEntries(activeType === "ALL" ? entries : entries.filter((entry) => entry.type === activeType), query)), [entries, activeType, query]);
  const editing = editKey ? entries.find((entry) => `${entry.type}:${entry.id}` === editKey) : undefined;
  const active = types.find((item) => item.value === activeType)!;
  return <>
    <section className="learning-toolbar">
      <nav className="learning-filters" aria-label="Тип записи">{types.map((item) => <Link className={item.value === activeType ? "active" : ""} href={`?type=${item.value}`} key={item.value}>{item.label}</Link>)}</nav>
      <label className="learning-search"><span>Поиск</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, comparatives" /></label>
      {activeType === "ALL" ? <details className="learning-add-menu"><summary>{active.add}</summary><div>{types.slice(1).map((item) => <Link key={item.value} href={`?type=ALL&add=${item.value}`}>{item.label}</Link>)}</div></details> : <Link className="button learning-scoped-add" href={`?type=${activeType}&add=${activeType}`}>{active.add}</Link>}
      <button className="secondary-button learning-report-open" type="button" onClick={() => setReportOpen(true)}>Сформировать отчёт</button>
    </section>
    <section className="learning-timeline">{visible.map((entry) => <LearningCard key={`${entry.type}:${entry.id}`} entry={entry} studentId={studentId} activeType={activeType} />)}{!visible.length && <div className="learning-empty">Записей по выбранному фильтру пока нет.</div>}</section>
    {(addType || editing) && <LearningSheet studentId={studentId} entry={editing} type={editing?.type ?? addType!} lessons={lessons} activeType={activeType} />}
    {reportOpen && <LearningReportBuilder studentName={studentName} entries={entries} onClose={() => setReportOpen(false)} />}
  </>;
}

const reportLabels: Record<ReportSection, string> = { VOCABULARY: "Vocabulary", GRAMMAR_FUNCTION: "Grammar / Functions", TEST: "Tests", NOTE: "Teacher Notes" };

function LearningReportBuilder({ studentName, entries, onClose }: { studentName: string; entries: LearningEntry[]; onClose(): void }) {
  const [periodKind, setPeriodKind] = useState<"WEEK" | "MONTH" | "CUSTOM">("MONTH");
  const month = currentMonthPeriod();
  const [customStart, setCustomStart] = useState(month.start), [customEnd, setCustomEnd] = useState(month.end);
  const customValid = Boolean(customStart && customEnd && customStart <= customEnd);
  const period = useMemo(() => periodKind === "WEEK" ? currentWeekPeriod() : periodKind === "MONTH" ? currentMonthPeriod() : customValid ? customReportPeriod(customStart, customEnd) : { ...month, label: "Укажите корректный период" }, [periodKind, customStart, customEnd, customValid]);
  const available = useMemo(() => availableReportSections(entriesInReportPeriod(entries, period)), [entries, period]);
  const [selection, setSelection] = useState<ReportSection[]>(availableReportSections(entriesInReportPeriod(entries, month)));
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => { setSelection(available); setDraft(null); }, [available]);
  const selected = selection.filter((type) => available.includes(type));
  const generate = () => { if (!customValid && periodKind === "CUSTOM") return; setDraft(generateLearningReport(studentName, entries, period, selected)); };
  return <div className="learning-sheet-backdrop"><aside className="learning-sheet learning-report-sheet"><header><div><small>Черновик для родителя</small><h2>Отчёт · {studentName}</h2></div><button type="button" aria-label="Закрыть" onClick={onClose}>×</button></header><div className="learning-report-content"><section className="report-period"><h3>Период</h3><div>{[["WEEK", "Текущая неделя"], ["MONTH", "Текущий месяц"], ["CUSTOM", "Произвольный период"]].map(([value, label]) => <button className={periodKind === value ? "active" : ""} type="button" key={value} onClick={() => { setPeriodKind(value as typeof periodKind); setDraft(null); }}>{label}</button>)}</div>{periodKind === "CUSTOM" && <div className="report-custom-dates"><label><span>С</span><input type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); setDraft(null); }} /></label><label><span>По</span><input type="date" value={customEnd} min={customStart} onChange={(event) => { setCustomEnd(event.target.value); setDraft(null); }} /></label></div>}<p>{period.label}</p></section><section className="report-sections"><h3>Разделы</h3>{(["VOCABULARY", "GRAMMAR_FUNCTION", "TEST", "NOTE"] as ReportSection[]).map((type) => <label className={!available.includes(type) ? "disabled" : ""} key={type}><input type="checkbox" checked={available.includes(type) && selected.includes(type)} disabled={!available.includes(type)} onChange={(event) => setSelection((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type))} /><span>{reportLabels[type]}</span></label>)}</section><button type="button" onClick={generate} disabled={!available.length}>Сформировать черновик</button>{!available.length && <p className="report-empty">В выбранном периоде нет записей для отчёта.</p>}{draft !== null && <section className="report-preview"><header><div><strong>{studentName}</strong><span>{period.label}</span></div></header><label><span>Текст отчёта</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} /></label><footer><ShareActions title={`${studentName} · ${period.label}`} text={draft} /></footer></section>}</div></aside></div>;
}

function LearningCard({ entry, studentId, activeType }: { entry: LearningEntry; studentId: string; activeType: "ALL" | LearningEntryType }) {
  const [expanded, setExpanded] = useState(false);
  const long = (entry.content?.length ?? 0) > 260 || (entry.content?.split("\n").length ?? 0) > 7;
  return <article className={`learning-card learning-${entry.type.toLowerCase()}`}><header><div><span>{labels[entry.type]}</span><time>{dateLabel(entry.date)}</time></div><Link href={`?type=${activeType}&edit=${entry.type}:${entry.id}`}>Изменить</Link></header><h2>{entry.title}</h2>{entry.type === "TEST" ? <div className="learning-score">{entry.score !== null ? <strong>{entry.score}{entry.maxScore !== null ? ` / ${entry.maxScore}` : ""}</strong> : <strong>Качественная оценка</strong>}{entry.percentage !== null && <span>{entry.percentage}%</span>}</div> : entry.content && <div className={`learning-content ${long && !expanded ? "collapsed" : ""}`}>{entry.content}</div>}{long && <button className="learning-expand" onClick={() => setExpanded((value) => !value)}>{expanded ? "Свернуть" : "Показать полностью"}</button>}{entry.note && <p className="learning-note">{entry.note}</p>}<footer>{entry.contextName && <span>Контекст: {entry.contextName}</span>}{entry.sourceLessonId && entry.sourceLesson && <Link href={`/lessons?entity=${entry.sourceLesson.entityKey}&lesson=${entry.sourceLessonId}`}>Урок {dateLabel(entry.sourceLesson.date)} · {entry.sourceLesson.title}</Link>}{entry.attachments.map((attachment, index) => <a href={attachment.externalUrl ?? "#"} target="_blank" rel="noreferrer" key={`${attachment.fileName}:${index}`}>↗ {attachment.fileName}</a>)}</footer></article>;
}

function AttachmentPicker() {
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return <div className="learning-file-picker"><label className="secondary-button"><input ref={input} name="attachment" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />+ Прикрепить файл</label>{file && <div><span>📎 {file.name}</span><button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}>Удалить</button></div>}</div>;
}

function LearningSheet({ studentId, type, entry, lessons, activeType }: { studentId: string; type: LearningEntryType; entry?: LearningEntry; lessons: SourceOption[]; activeType: "ALL" | LearningEntryType }) {
  const action = entry ? updateLearningProfileEntry.bind(null, studentId, entry.type, entry.id) : createLearningProfileEntry.bind(null, studentId);
  const close = `/students/${studentId}/learning?type=${activeType}`;
  return <div className="learning-sheet-backdrop"><aside className="learning-sheet"><header><div><small>{entry ? "Редактирование" : "Новая запись"}</small><h2>{labels[type]}</h2></div><Link href={close}>×</Link></header><form action={action} className="learning-entry-form"><input type="hidden" name="recordType" value={type} /><label className="learning-date"><span>Дата</span><input name="entryDate" type="date" required defaultValue={entry?.date ?? new Date().toISOString().slice(0, 10)} /></label><label><span>{type === "NOTE" ? "Заголовок, необязательно" : "Тема / название"}</span><input name="title" required={type !== "NOTE"} defaultValue={entry?.title ?? ""} /></label>{type !== "TEST" && <label><span>{type === "VOCABULARY" ? "Лексика" : type === "GRAMMAR_FUNCTION" ? "Структуры / функции" : "Наблюдение"}</span><textarea name="content" required rows={type === "NOTE" ? 6 : 9} defaultValue={entry?.content ?? ""} /></label>}{type === "TEST" && <div className="learning-score-fields"><label><span>Баллы</span><input name="score" inputMode="decimal" defaultValue={entry?.score ?? ""} /></label><label><span>Максимум</span><input name="maxScore" inputMode="decimal" defaultValue={entry?.maxScore ?? ""} /></label></div>}{type !== "NOTE" && <label><span>{type === "TEST" ? "Комментарий, необязательно" : "Комментарий учителя, необязательно"}</span><textarea name="note" rows={3} defaultValue={entry?.note ?? ""} /></label>}<details className="learning-lesson-link" open={Boolean(entry?.sourceLessonId)}><summary>Связать с уроком</summary><select name="sourceLessonId" defaultValue={entry?.sourceLessonId ?? ""}><option value="">Без связи с уроком</option>{lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{dateLabel(lesson.date)} · {lesson.title}{lesson.contextName ? ` · ${lesson.contextName}` : ""}</option>)}</select></details><AttachmentPicker />{entry?.attachments.length ? <div className="learning-existing-attachments"><strong>Прикреплённые файлы</strong>{entry.attachments.map((attachment, index) => <a key={`${attachment.fileName}:${index}`} href={attachment.externalUrl ?? "#"} target="_blank" rel="noreferrer">{attachment.fileName}</a>)}</div> : null}<footer><Link className="secondary-button" href={close}>Отмена</Link><button>Сохранить</button></footer></form>{entry && <form action={deleteLearningProfileEntry.bind(null, studentId, entry.type, entry.id)} className="learning-delete" onSubmit={(event) => { if (!window.confirm("Удалить эту запись?")) event.preventDefault(); }}><button className="danger-button">Удалить запись</button></form>}</aside></div>;
}
