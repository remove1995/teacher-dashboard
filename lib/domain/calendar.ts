export type CalendarKind = "INDIVIDUAL" | "PAIR" | "GROUP";
export type CalendarView = "week" | "month";
export type CalendarEventLike = { id: string; kind: CalendarKind; date: string; startMinute: number; durationMinutes: number };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const atUtc = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function weekRange(focus: string) {
  const start = atUtc(focus);
  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - weekday + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end, days: Array.from({ length: 7 }, (_, index) => { const day = new Date(start); day.setUTCDate(day.getUTCDate() + index); return day; }) };
}

export function monthRange(focus: string) {
  const value = atUtc(focus);
  const first = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
  const gridStart = weekRange(iso(first)).start;
  const finalWeek = weekRange(iso(last));
  return { start: first, end: last, gridStart, gridEnd: finalWeek.end };
}

export function shiftCalendarFocus(focus: string, view: CalendarView, direction: -1 | 1) {
  const date = atUtc(focus);
  if (view === "week") date.setUTCDate(date.getUTCDate() + direction * 7);
  else date.setUTCMonth(date.getUTCMonth() + direction, 1);
  return iso(date);
}

export function filterCalendarEvents<T extends { kind: CalendarKind }>(events: T[], kind: "ALL" | CalendarKind) {
  return kind === "ALL" ? events : events.filter((event) => event.kind === kind);
}

export function visibleDayBounds(events: Array<{ startMinute: number; durationMinutes: number }>) {
  if (!events.length) return { startMinute: 8 * 60, endMinute: 21 * 60 };
  const earliest = Math.min(...events.map((event) => event.startMinute));
  const latest = Math.max(...events.map((event) => event.startMinute + event.durationMinutes));
  return { startMinute: Math.max(6 * 60, Math.floor((earliest - 30) / 60) * 60), endMinute: Math.min(23 * 60, Math.ceil((latest + 30) / 60) * 60) };
}

export function layoutOverlaps<T extends CalendarEventLike>(events: T[]) {
  const byDate = new Map<string, T[]>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  const result = new Map<string, { column: number; columns: number; conflict: boolean }>();
  for (const dayEvents of byDate.values()) {
    const sorted = [...dayEvents].sort((a, b) => a.startMinute - b.startMinute || a.id.localeCompare(b.id));
    const groups: T[][] = [];
    let activeEnd = -1;
    for (const event of sorted) {
      if (!groups.length || event.startMinute >= activeEnd) { groups.push([event]); activeEnd = event.startMinute + event.durationMinutes; }
      else { groups.at(-1)!.push(event); activeEnd = Math.max(activeEnd, event.startMinute + event.durationMinutes); }
    }
    for (const group of groups) group.forEach((event, column) => result.set(event.id, { column, columns: group.length, conflict: group.length > 1 }));
  }
  return result;
}

export const currentCalendarFocus = (today: string) => today;

export function applyOccurrenceOverride<T extends { id:string; date:string; startMinute:number; durationMinutes:number; manuallyEdited:boolean }>(event:T, change:{date:string;startMinute:number;durationMinutes:number}) {
  return { ...event, ...change, manuallyEdited:true };
}

export function cancelOccurrence<T extends { id:string; status:string }>(event:T) { return { ...event, status:"CANCELLED" as const }; }
export function calendarStatusClass(status:string) { return `calendar-event-${status.toLowerCase()}`; }
export function oneOffLessonDraft(target:{studentId?:string;cohortId?:string},date:string,startMinute:number,durationMinutes:number) { return { ...target,date,startMinute,durationMinutes,manuallyEdited:true,recurringScheduleId:null }; }
export function linkedReschedule(originalId:string,replacementId:string){return {original:{id:originalId,status:"RESCHEDULED" as const},replacement:{id:replacementId,originalLessonId:originalId,status:"PLANNED" as const}};}
