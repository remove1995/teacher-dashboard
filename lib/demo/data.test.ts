import { describe, expect, it } from "vitest";
import { demoLessonMonths, demoLessons, demoPayments, demoPaymentSummary, demoStudents, filterDemoPeople } from "./data";

describe("read-only demo fixtures", () => {
  it("uses stable unique identifiers", () => {
    for (const collection of [demoStudents, demoLessons, demoPayments]) {
      expect(new Set(collection.map(({ id }) => id)).size).toBe(collection.length);
    }
  });

  it("covers planned and completed lessons across multiple months", () => {
    expect(new Set(demoLessons.map(({ status }) => status))).toEqual(new Set(["PLANNED", "COMPLETED"]));
    expect(demoLessonMonths().length).toBeGreaterThanOrEqual(3);
  });

  it("derives payment totals from fixture rows", () => {
    const summary = demoPaymentSummary();
    expect(summary.expectedMinor).toBeGreaterThan(summary.receivedMinor);
    expect(summary.outstandingMinor).toBe(summary.expectedMinor - summary.receivedMinor);
  });

  it("combines student filters with case-insensitive search", () => {
    expect(filterDemoPeople("PAIR", "адам").cohorts.map(({ id }) => id)).toEqual(["adam-daniel"]);
    expect(filterDemoPeople("GROUP", "АДАМ").cohorts).toHaveLength(0);
    expect(filterDemoPeople("INDIVIDUAL", "алина").students.map(({ id }) => id)).toEqual(["alina"]);
  });
});
