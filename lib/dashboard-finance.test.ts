import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ student: { findMany: vi.fn() }, cohort: { findMany: vi.fn() }, lesson: { findMany: vi.fn(), count: vi.fn() }, credit: { findMany: vi.fn() }, payment: { findMany: vi.fn() } }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/domain/money", async () => import("./domain/money"));
vi.mock("@/lib/domain/people", async () => import("./domain/people"));
vi.mock("@/lib/domain/member-billing", async () => import("./domain/member-billing"));
vi.mock("@/lib/domain/lesson", async () => import("./domain/lesson"));
vi.mock("@/app/actions/payments", () => ({ correctPayment: vi.fn(), createPayment: vi.fn() }));
vi.mock("@/lib/domain/dates", async () => ({ ...await import("./domain/dates"), todayDate: () => "2026-10-07" }));
vi.mock("@/lib/settings", () => ({ getTeacherSettings: async () => ({ displayName: "Teacher", timezone: "Europe/Moscow" }) }));
vi.mock("@/lib/services/finance-service", async () => import("./services/finance-service"));
vi.mock("@/components/page-placeholder", () => ({ PagePlaceholder: "section" }));
vi.mock("next/link", () => ({ default: "a" }));
import DashboardPage from "../app/page";
import { getFinanceWorkspace, monthPeriod } from "./services/finance-service";
import { PaymentsWorkspace } from "../components/payments-workspace";

const date = (day: number) => new Date(Date.UTC(2026, 9, day));
const period = monthPeriod("2026-10");
const receipt = (id: string, actualAmountMinor: number, correctsPaymentId: string | null = null, paymentDate = date(2)) => ({ id, studentId: "student", cohortId: "cohort", billingModel: "MONTHLY_PREPAID", actualAmountMinor, suggestedAmountMinor: 80000, manuallyOverridden: false, correctsPaymentId, periodStart: date(1), periodEnd: date(31), paymentDate, status: "PAID", comment: null, receiptUrl: null });
const occurrences = ["COMPLETED", "PLANNED", "CANCELLED", "RESCHEDULED", "COMPLETED"].map((status, i) => ({ id: `lesson-${i}`, originalLessonId: i === 4 ? "lesson-3" : null, studentId: null, cohortId: "cohort", scheduledDate: date(i + 1), status }));

beforeEach(() => {
  vi.clearAllMocks();
  // Vitest's JSX transform can use the classic React runtime for Next pages.
  vi.stubGlobal("React", React);
  db.student.findMany.mockResolvedValue([]);
  db.credit.findMany.mockResolvedValue([]);
  db.lesson.count.mockResolvedValue(0);
  db.lesson.findMany.mockImplementation(async (args) => args.select?.originalLessonId ? occurrences : []);
});
afterEach(() => vi.unstubAllGlobals());

function nodes(node: React.ReactNode): React.ReactElement<{ className?: string; children?: React.ReactNode }>[] {
  return React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) return [];
    return [child, ...nodes(child.props.children)];
  });
}
const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);

describe("actionable Dashboard and working Finance UI", () => {
  const planned = (id: string, cohort = false, title = "Lesson topic") => ({ id, studentId: cohort ? null : "student", cohortId: cohort ? "cohort" : null, scheduledDate: date(8), startMinute: 600, title, status: "PLANNED", student: cohort ? null : { name: "Student", color: "#83916f" }, cohort: cohort ? { name: "Pair", color: "#83916f" } : null });
  const completed = (id: string, homeworkText: string | null = null) => ({ ...planned(id), status: "COMPLETED", homeworkText });
  function lessons(upcoming: ReturnType<typeof planned>[], homework: ReturnType<typeof completed>[]) {
    db.lesson.findMany.mockImplementation(async (args) => args.select?.originalLessonId ? occurrences : args.where?.status === "PLANNED" ? upcoming : args.where?.status === "COMPLETED" ? homework : []);
  }
  const links = (page: React.ReactNode) => nodes(page).filter((node) => node.type === "a") as React.ReactElement<{ href: string; children?: React.ReactNode }>[];
  const count = (page: React.ReactNode) => nodes(page).find((node) => node.props.className === "attention-count")?.props.children;
  beforeEach(() => {
    db.cohort.findMany.mockResolvedValue([]);
    db.payment.findMany.mockResolvedValue([]);
    lessons([], []);
  });

  it("shows only student received, outstanding and other income in the working Finance KPI row", () => {
    const html = renderToStaticMarkup(React.createElement(PaymentsWorkspace, { rows: [], period, otherReceivedMinor: 350025, summary: { expectedMinor: 10000, receivedMinor: 8000, earnedMinor: 7000, outstandingMinor: 2000, creditMinor: 90000 } }));
    expect(html).toContain("Получено");
    expect(html).toContain("Ожидается");
    expect(html).toContain("Другие доходы");
    expect(html).not.toContain("Кредиты");
    expect(html).not.toContain("Заработано");
    expect(html.split("class=").filter((part) => part.startsWith(String.fromCharCode(34) + "finance-kpi-")).length).toBe(3);
  });

  it("links an individual name to the Student and its title to the exact lesson", async () => {
    lessons([planned("individual")], []);
    const targets = links(await DashboardPage());
    expect(targets.find((link) => link.props.children === "Student")?.props.href).toBe("/students/student");
    const url = new URL(targets.find((link) => link.props.children === "Lesson topic")!.props.href, "http://localhost");
    expect(url.pathname).toBe("/lessons");
    expect(Object.fromEntries(url.searchParams)).toEqual({ entity: "student:student", lesson: "individual", focusMonth: "2026-10" });
  });

  it("links a pair/group name to the Cohort and fallback title to its exact lesson", async () => {
    lessons([planned("cohort-lesson", true, "Урок · Pair")], []);
    const targets = links(await DashboardPage());
    expect(targets.find((link) => link.props.children === "Pair")?.props.href).toBe("/cohorts/cohort");
    const url = new URL(targets.find((link) => link.props.children === "Урок · Pair")!.props.href, "http://localhost");
    expect(url.searchParams.get("entity")).toBe("cohort:cohort");
    expect(url.searchParams.get("lesson")).toBe("cohort-lesson");
  });

  it("shows two individually linked missing-homework records and counts records, not categories", async () => {
    lessons([], [completed("missing-1"), completed("missing-2", "  "), completed("has-homework", "Practice")]);
    const page = await DashboardPage();
    expect(count(page)).toBe(2);
    const attention = nodes(page).find((node) => node.props.className === "dashboard-attention-groups");
    expect(links(attention).map((link) => new URL(link.props.href, "http://localhost").searchParams.get("lesson"))).toEqual(["missing-1", "missing-2"]);
  });

  it("shows one genuine partial context and ignores stale partial Payment statuses when fully paid", async () => {
    db.cohort.findMany.mockResolvedValue([{ id: "cohort", name: "Context", kind: "GROUP", color: "#83916f", memberships: [{ id: "membership", activeFrom: date(1), activeTo: null, status: "REGULAR", regularFrom: null, trialLessonDate: null, billingProfiles: [{ id: "billing", studentId: "student", cohortId: "cohort", model: "MONTHLY_PREPAID", amountMinor: 20000, effectiveFrom: date(1), effectiveTo: null }], student: { id: "student", name: "Student", billingProfiles: [] } }] }]);
    db.payment.findMany.mockResolvedValue([{ ...receipt("partial", 10000), status: "PARTIALLY_PAID" }]);
    lessons([], [completed("homework")]);
    let page = await DashboardPage();
    expect(count(page)).toBe(2);
    const paymentLink = links(page).find((link) => link.props.href.startsWith("/payments?"))!;
    expect(Object.fromEntries(new URL(paymentLink.props.href, "http://localhost").searchParams)).toEqual({ month: "2026-10", kind: "GROUP", q: "Context" });
    expect(paymentLink.props.children).toEqual(["Context", " · осталось ", rubles(50000)]);
    db.payment.findMany.mockResolvedValue([{ ...receipt("settled", 60000), status: "PARTIALLY_PAID" }]);
    page = await DashboardPage();
    expect(count(page)).toBe(1);
    expect(links(page).filter((link) => link.props.href.startsWith("/payments?"))).toHaveLength(0);
  });

  it("omits empty categories and renders the small empty attention state", async () => {
    const page = await DashboardPage();
    expect(count(page)).toBe(0);
    expect(nodes(page).some((node) => node.type === "p" && node.props.children === "Сейчас всё в порядке.")).toBe(true);
    expect(nodes(page).some((node) => node.props.className === "dashboard-attention-groups")).toBe(false);
  });
});

describe("Dashboard and Payments share monthly financial totals", () => {
  it.each(["MONTHLY_PREPAID", "WEEKLY_PREPAID", "PAY_PER_LESSON", "GROUP_SUBSCRIPTION"])("renders finance-service cash/outstanding for %s, with corrections and nonbillable occurrences", async (model) => {
    db.cohort.findMany.mockResolvedValue([{ id: "cohort", name: "Context", kind: "PAIR", color: "#83916f", memberships: [{ id: "membership", activeFrom: date(1), activeTo: null, status: "REGULAR", regularFrom: null, trialLessonDate: null, billingProfiles: [{ id: "billing", studentId: "student", cohortId: "cohort", model, amountMinor: 20000, effectiveFrom: date(1), effectiveTo: null }], student: { id: "student", name: "Student", billingProfiles: [] } }] }]);
    const payments = [receipt("old", 50000), receipt("corrected", 10000, "old"), receipt("second", 5000), { ...receipt("outside", 90000, null, new Date("2026-09-30T00:00:00Z")), periodStart: new Date("2026-09-01T00:00:00Z"), periodEnd: new Date("2026-09-30T00:00:00Z") }].map((p) => ({ ...p, billingModel: model }));
    db.payment.findMany.mockResolvedValue(payments);
    const workspace = await getFinanceWorkspace(period);
    expect(workspace.summary.receivedMinor).toBe(15000);
    expect(workspace.summary.outstandingMinor).toBe(model === "GROUP_SUBSCRIPTION" ? 5000 : model === "PAY_PER_LESSON" ? 25000 : 45000);
    const page = await DashboardPage();
    const financialCard = nodes(page).filter((node) => node.props.className === "summary-card")[2];
    const rendered = nodes(financialCard);
    expect(rendered.find((node) => node.type === "strong")?.props.children).toBe(rubles(workspace.summary.receivedMinor));
    expect(rendered.find((node) => node.type === "small")?.props.children).toBe(`Ожидается ещё ${rubles(workspace.summary.outstandingMinor)}`);
    expect(rendered.find((node) => node.type === "span")?.props.children).toEqual(["Получено в ", new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(period.start)]);
  });

  it("resolves corrections across month boundaries before selecting cash and shows the zero-debt state", async () => {
    db.cohort.findMany.mockResolvedValue([]);
    db.payment.findMany.mockResolvedValue([receipt("old", 50000), receipt("correction-next-month", 30000, "old", new Date("2026-11-02T00:00:00Z")), receipt("current", 10000)]);
    const workspace = await getFinanceWorkspace(period);
    expect(workspace.summary).toMatchObject({ receivedMinor: 10000, outstandingMinor: 0 });
    const page = await DashboardPage();
    const financialCard = nodes(page).filter((node) => node.props.className === "summary-card")[2];
    const rendered = nodes(financialCard);
    expect(rendered.find((node) => node.type === "strong")?.props.children).toBe(rubles(workspace.summary.receivedMinor));
    expect(rendered.find((node) => node.type === "small")?.props.children).toBe("Ожидаемых оплат нет");
  });
});
