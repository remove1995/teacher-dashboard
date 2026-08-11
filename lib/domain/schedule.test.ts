import { describe, expect, it } from "vitest";
import { generateOccurrences, nextScheduleRevision, partitionScheduleUpdate, sourceOccurrenceDate } from "./schedule";

describe("recurring schedules", () => {
  it("generates weekly occurrences and applies an occurrence override", () => {
    expect(generateOccurrences({ effectiveFrom: "2026-08-03", effectiveTo: "2026-08-17", slots: [{ weekday: 1, startMinute: 900, durationMinutes: 60 }], exceptions: [{ occurrenceDate: "2026-08-10", kind: "OCCURRENCE_OVERRIDE", replacementDate: "2026-08-11", replacementStartMinute: 960 }] })).toEqual([
      { date: "2026-08-03", startMinute: 900, durationMinutes: 60 },
      { date: "2026-08-11", startMinute: 960, durationMinutes: 60, replacesDate: "2026-08-10" },
      { date: "2026-08-17", startMinute: 900, durationMinutes: 60 },
    ]);
  });
  it("preserves past and manually edited future lessons", () => {
    const lessons = [{ id: "past", scheduledDate: new Date("2026-08-01"), manuallyEdited: false, status: "PLANNED" }, { id: "edited", scheduledDate: new Date("2026-08-20"), manuallyEdited: true, status: "PLANNED" }, { id: "materialized", scheduledDate: new Date("2026-08-20"), manuallyEdited: false, kanbanVisible:true, status:"PLANNED" }, { id: "completed", scheduledDate: new Date("2026-08-20"), manuallyEdited: false, status: "COMPLETED" }, { id: "generated", scheduledDate: new Date("2026-08-21"), manuallyEdited: false, status: "PLANNED" }];
    const result = partitionScheduleUpdate(lessons, new Date("2026-08-10"));
    expect(result.preserved.map(({ id }) => id)).toEqual(["past", "edited", "materialized", "completed"]);
    expect(result.replaceable.map(({ id }) => id)).toEqual(["generated"]);
  });
  it("extracts the source date used to protect a manually edited occurrence", () => expect(sourceOccurrenceDate("schedule-id:2026-08-20:960")).toBe("2026-08-20"));
  it("rejects malformed slot times", () => expect(() => generateOccurrences({ effectiveFrom: "2026-08-03", effectiveTo: "2026-08-03", slots: [{ weekday: 1, startMinute: 1500, durationMinutes: 60 }] })).toThrow("startMinute"));
  it("supports a different time and duration for each weekday", () => expect(generateOccurrences({ effectiveFrom: "2026-08-03", effectiveTo: "2026-08-06", slots: [{ weekday: 1, startMinute: 960, durationMinutes: 60 }, { weekday: 4, startMinute: 1110, durationMinutes: 90 }] })).toEqual([{ date: "2026-08-03", startMinute: 960, durationMinutes: 60 }, { date: "2026-08-06", startMinute: 1110, durationMinutes: 90 }]));
  it("increments schedule revisions without mutating the previous revision", () => { const current = 3; expect(nextScheduleRevision(current)).toBe(4); expect(current).toBe(3); });
});
