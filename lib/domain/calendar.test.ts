import { describe, expect, it } from "vitest";
import { applyOccurrenceOverride, calendarStatusClass, cancelOccurrence, currentCalendarFocus, filterCalendarEvents, layoutOverlaps, linkedReschedule, monthRange, oneOffLessonDraft, shiftCalendarFocus, visibleDayBounds, weekRange } from "./calendar";

describe("calendar ranges", () => {
  it("selects a Monday-Sunday week", () => { const range = weekRange("2026-08-11"); expect(range.start.toISOString().slice(0,10)).toBe("2026-08-10"); expect(range.end.toISOString().slice(0,10)).toBe("2026-08-16"); });
  it("selects the visible month and adjacent grid days", () => { const range = monthRange("2026-08-11"); expect(range.start.toISOString().slice(0,10)).toBe("2026-08-01"); expect(range.end.toISOString().slice(0,10)).toBe("2026-08-31"); expect(range.gridStart <= range.start).toBe(true); expect(range.gridEnd >= range.end).toBe(true); });
  it("navigates week, month, and today", () => { expect(shiftCalendarFocus("2026-08-11", "week", 1)).toBe("2026-08-18"); expect(shiftCalendarFocus("2026-08-11", "month", -1)).toBe("2026-07-01"); expect(currentCalendarFocus("2026-08-11")).toBe("2026-08-11"); });
});

describe("calendar projection", () => {
  const events = [{ id:"i",kind:"INDIVIDUAL" as const,date:"2026-08-11",startMinute:960,durationMinutes:60 },{ id:"p",kind:"PAIR" as const,date:"2026-08-11",startMinute:990,durationMinutes:60 },{ id:"g",kind:"GROUP" as const,date:"2026-08-12",startMinute:1110,durationMinutes:75 }];
  it("filters exact entity kinds", () => { expect(filterCalendarEvents(events,"INDIVIDUAL").map(({id})=>id)).toEqual(["i"]); expect(filterCalendarEvents(events,"PAIR").map(({id})=>id)).toEqual(["p"]); expect(filterCalendarEvents(events,"GROUP").map(({id})=>id)).toEqual(["g"]); });
  it("lays overlapping lessons side by side and flags conflicts", () => { const layout=layoutOverlaps(events); expect(layout.get("i")).toMatchObject({column:0,columns:2,conflict:true}); expect(layout.get("p")).toMatchObject({column:1,columns:2,conflict:true}); });
  it("derives a useful teaching-day time range", () => expect(visibleDayBounds(events)).toEqual({startMinute:900,endMinute:1260}));
  it("keeps multiple contexts for one student as independent event identities", () => expect(new Set(events.map(({id})=>id)).size).toBe(3));
  it("edits one occurrence date/time while keeping the same Lesson identity",()=>expect(applyOccurrenceOverride({...events[0],manuallyEdited:false},{date:"2026-08-13",startMinute:1080,durationMinutes:75})).toMatchObject({id:"i",date:"2026-08-13",startMinute:1080,durationMinutes:75,manuallyEdited:true}));
  it("keeps cancellation as a historical Lesson record",()=>expect(cancelOccurrence({id:"lesson",status:"PLANNED",title:"Food"})).toEqual({id:"lesson",status:"CANCELLED",title:"Food"}));
  it("represents explicit rescheduling as linked original and replacement",()=>expect(linkedReschedule("old","new")).toEqual({original:{id:"old",status:"RESCHEDULED"},replacement:{id:"new",originalLessonId:"old",status:"PLANNED"}}));
  it("uses the same completed status in calendar presentation",()=>expect(calendarStatusClass("COMPLETED")).toBe("calendar-event-completed"));
  it("creates a one-off Lesson draft without a recurring schedule",()=>expect(oneOffLessonDraft({studentId:"student"},"2026-08-14",960,60)).toMatchObject({studentId:"student",date:"2026-08-14",manuallyEdited:true,recurringScheduleId:null}));
});
