import type { LearningEntry, LearningEntryType } from "./learning";

export type ReportSection = LearningEntryType;
export type ReportPeriod = { start: string; end: string; label: string };

const formatDate = (value: Date) => value.toISOString().slice(0, 10);
const displayDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function currentWeekPeriod(now = new Date()): ReportPeriod {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (date.getUTCDay() + 6) % 7;
  const start = new Date(date); start.setUTCDate(date.getUTCDate() - offset);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  return { start: formatDate(start), end: formatDate(end), label: `${displayDate(formatDate(start))} — ${displayDate(formatDate(end))}` };
}

export function currentMonthPeriod(now = new Date()): ReportPeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: formatDate(start), end: formatDate(end), label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(start) };
}

export function customReportPeriod(start: string, end: string): ReportPeriod {
  if (!start || !end || start > end) throw new Error("Некорректный период отчёта");
  return { start, end, label: `${displayDate(start)} — ${displayDate(end)}` };
}

export function entriesInReportPeriod(entries: LearningEntry[], period: ReportPeriod) {
  return entries.filter((entry) => entry.date >= period.start && entry.date <= period.end);
}

export function availableReportSections(entries: LearningEntry[]): ReportSection[] {
  const present = new Set(entries.map((entry) => entry.type));
  return (["VOCABULARY", "GRAMMAR_FUNCTION", "TEST", "NOTE"] as ReportSection[]).filter((type) => present.has(type));
}

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
const material = (entries: LearningEntry[], type: LearningEntryType) => entries.filter((entry) => entry.type === type);
const topics = (entries: LearningEntry[]) => unique(entries.flatMap((entry) => [entry.title, entry.content ?? ""]));

export function generateLearningReport(studentName: string, entries: LearningEntry[], period: ReportPeriod, selected: ReportSection[]) {
  const source = entriesInReportPeriod(entries, period).filter((entry) => selected.includes(entry.type));
  if (!source.length) return null;
  const paragraphs = [`Обратная связь по обучению ${studentName} за период ${period.label}.`];
  const vocabulary = material(source, "VOCABULARY");
  const grammar = material(source, "GRAMMAR_FUNCTION");
  const tests = material(source, "TEST");
  const notes = material(source, "NOTE");
  if (vocabulary.length || grammar.length) {
    const covered: string[] = [];
    if (vocabulary.length) covered.push(`Лексика:\n${topics(vocabulary).join("\n")}`);
    if (grammar.length) covered.push(`Грамматика и функции:\n${topics(grammar).join("\n")}`);
    paragraphs.push(`За это время мы работали над следующим материалом.\n${covered.join("\n\n")}`);
  }
  if (tests.length) {
    const results = tests.map((entry) => {
      const score = entry.score !== null ? entry.maxScore !== null ? `${entry.score}/${entry.maxScore}` : String(entry.score) : entry.percentage !== null ? `${entry.percentage}%` : "качественная оценка";
      return `${entry.title || "Checkpoint"} — ${score}${entry.note ? `. ${entry.note}` : ""}`;
    });
    paragraphs.push(`Результаты проверочных работ:\n${results.join("\n")}`);
  }
  if (notes.length) {
    const observations = unique(notes.flatMap((entry) => [entry.content ?? "", entry.note ?? ""]));
    if (observations.length) paragraphs.push(`Наблюдения и дальнейший фокус:\n${observations.join("\n")}`);
  }
  return paragraphs.join("\n\n");
}
