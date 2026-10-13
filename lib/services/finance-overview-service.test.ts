import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ student: vi.fn(), other: vi.fn() }));
vi.mock("./finance-service", () => ({ getFinanceWorkspace: mocks.student }));
vi.mock("./extra-income-service", () => ({ getExtraIncomeWorkspace: mocks.other }));
import { getFinanceOverview } from "./finance-overview-service";
const period = { key: "2026-10", label: "Октябрь 2026", start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-10-31T00:00:00Z") };
describe("shared finance cash overview", () => {
  it("combines corrected student cash and other income without credits, debt or accrual", async () => {
    const student = { rows: [], summary: { receivedMinor: 12345, creditMinor: 90000, expectedMinor: 50000, earnedMinor: 80000, outstandingMinor: 7777 } };
    mocks.student.mockResolvedValue(student); mocks.other.mockResolvedValue({ records: [], tags: [], receivedMinor: 3529 });
    const result = await getFinanceOverview(period);
    expect(result.student).toBe(student);
    expect(result.cash).toEqual({ studentReceivedMinor: 12345, otherReceivedMinor: 3529, totalReceivedMinor: 15874 });
    expect(mocks.student).toHaveBeenCalledWith(period); expect(mocks.other).toHaveBeenCalledWith(period);
  });
});
