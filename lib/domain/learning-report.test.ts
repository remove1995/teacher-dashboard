import { describe, expect, it } from "vitest";
import type { LearningEntry } from "./learning";
import { availableReportSections, currentMonthPeriod, customReportPeriod, entriesInReportPeriod, generateLearningReport } from "./learning-report";

const entry = (overrides: Partial<LearningEntry> = {}): LearningEntry => ({ id: "v", type: "VOCABULARY", date: "2026-08-10", title: "Food", content: "salad\napple juice", note: null, score: null, maxScore: null, percentage: null, sourceLessonId: null, cohortId: null, attachments: [], ...overrides });
describe("parent learning report", () => {
  it("filters the current month", () => expect(entriesInReportPeriod([entry(), entry({ id: "old", date: "2026-07-31" })], currentMonthPeriod(new Date("2026-08-11")))).toHaveLength(1));
  it("filters a custom period inclusively", () => expect(entriesInReportPeriod([entry(), entry({ id: "later", date: "2026-08-20" })], customReportPeriod("2026-08-09", "2026-08-11"))).toHaveLength(1));
  it("uses only selected sections", () => expect(generateLearningReport("Алина", [entry(), entry({ id: "g", type: "GRAMMAR_FUNCTION", title: "would like" })], customReportPeriod("2026-08-01", "2026-08-31"), ["VOCABULARY"])).not.toContain("would like"));
  it("excludes empty sections", () => expect(availableReportSections([entry()])).toEqual(["VOCABULARY"]));
  it("includes a scored test", () => expect(generateLearningReport("Алина", [entry({ type: "TEST", title: "Unit 3", content: null, score: 18, maxScore: 20 })], customReportPeriod("2026-08-01", "2026-08-31"), ["TEST"])).toContain("18/20"));
  it("supports a qualitative test", () => expect(generateLearningReport("Алина", [entry({ type: "TEST", content: null, score: null, maxScore: null })], customReportPeriod("2026-08-01", "2026-08-31"), ["TEST"])).toContain("качественная оценка"));
  it("includes teacher observations", () => expect(generateLearningReport("Алина", [entry({ type: "NOTE", content: "Стало увереннее отвечать." })], customReportPeriod("2026-08-01", "2026-08-31"), ["NOTE"])).toContain("Стало увереннее"));
  it("preserves English vocabulary and grammar", () => expect(generateLearningReport("Алина", [entry(), entry({ id: "g", type: "GRAMMAR_FUNCTION", title: "would like", content: "Would you like some...?" })], customReportPeriod("2026-08-01", "2026-08-31"), ["VOCABULARY", "GRAMMAR_FUNCTION"])).toContain("Would you like some...?"));
  it("does not mutate source records", () => { const records = [entry()]; const before = JSON.stringify(records); generateLearningReport("Алина", records, customReportPeriod("2026-08-01", "2026-08-31"), ["VOCABULARY"]); expect(JSON.stringify(records)).toBe(before); });
  it("returns null for an empty period", () => expect(generateLearningReport("Алина", [entry()], customReportPeriod("2025-01-01", "2025-01-31"), ["VOCABULARY"])).toBeNull());
});
