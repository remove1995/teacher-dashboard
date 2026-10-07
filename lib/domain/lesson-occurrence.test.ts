import { describe, expect, it } from "vitest";
import { canRescheduleOccurrence, hasRealLessonHistory, isEmptyPlannedOccurrence } from "./lesson-occurrence";

const empty = { status: "PLANNED", title: "Урок · Анна", defaultTitle: "Урок · Анна", attendance: [{ status: "PLANNED", manuallyEdited: false }] };

describe("lesson occurrence safety", () => {
  it("allows future and past empty planned occurrences to be removed", () => expect(isEmptyPlannedOccurrence(empty)).toBe(true));
  it("treats auto-created neutral attendance as technical rather than history", () => expect(isEmptyPlannedOccurrence({ ...empty, attendance: [{ status: "PLANNED", manuallyEdited: false }] })).toBe(true));
  it("treats a reschedule link and automatically rescheduled attendance as technical metadata", () => {
    expect(isEmptyPlannedOccurrence({ ...empty, originalLessonId: "original" })).toBe(true);
    expect(hasRealLessonHistory({ ...empty, status: "RESCHEDULED", replacementLesson: {}, attendance: [{ status: "RESCHEDULED", manuallyEdited: false }] })).toBe(false);
  });
  it("blocks removal when real history exists", () => {
    expect(isEmptyPlannedOccurrence({ ...empty, attendance: [{ status: "ABSENT", manuallyEdited: true }] })).toBe(false);
    expect(isEmptyPlannedOccurrence({ ...empty, homeworkText: "Повторить слова" })).toBe(false);
    expect(isEmptyPlannedOccurrence({ ...empty, learningRecords: [{}] })).toBe(false);
    expect(isEmptyPlannedOccurrence({ ...empty, credits: [{}] })).toBe(false);
  });
  it("allows a future planned occurrence to be rescheduled", () => expect(canRescheduleOccurrence(empty, false)).toBe(true));
  it("allows a past empty planned occurrence to be rescheduled", () => expect(canRescheduleOccurrence(empty, true)).toBe(true));
  it("does not use the calendar date alone to block a planned occurrence with lesson content", () => expect(canRescheduleOccurrence({ ...empty, homeworkText: "Повторить слова" }, true)).toBe(true));
  it("blocks completed and cancelled historical lessons from rescheduling", () => {
    expect(canRescheduleOccurrence({ ...empty, status: "COMPLETED" }, true)).toBe(false);
    expect(canRescheduleOccurrence({ ...empty, status: "CANCELLED" }, true)).toBe(false);
  });
});
