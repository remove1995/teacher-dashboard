import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { combinedMonthlyCash } from "./domain/extra-income";
const mocks = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/services/finance-overview-service", () => ({ getFinanceOverview: mocks.overview }));
vi.mock("@/lib/services/finance-service", async () => import("./services/finance-service"));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/domain/money", async () => import("./domain/money"));
vi.mock("@/lib/domain/people", async () => import("./domain/people"));
vi.mock("@/lib/domain/member-billing", async () => import("./domain/member-billing"));
vi.mock("@/lib/domain/extra-income", async () => import("./domain/extra-income"));
vi.mock("@/lib/action-state", async () => import("./action-state"));
vi.mock("@/lib/settings", () => ({ getTeacherSettings: async () => ({ timezone: "Europe/Moscow" }) }));
vi.mock("@/lib/domain/dates", () => ({ todayDate: () => "2026-10-13" }));
vi.mock("@/app/actions/payments", () => ({ correctPayment: vi.fn(), createPayment: vi.fn() }));
vi.mock("@/app/actions/extra-income", () => ({ saveExtraIncome: vi.fn(), deleteExtraIncome: vi.fn() }));
vi.mock("@/components/payments-workspace", async () => import("../components/payments-workspace"));
vi.mock("@/components/extra-income-workspace", async () => import("../components/extra-income-workspace"));
import PaymentsPage from "../app/payments/page";

const summary = { expectedMinor: 50000, receivedMinor: 12345, outstandingMinor: 7000, creditMinor: 90000, earnedMinor: 999999 };
const cash = combinedMonthlyCash(summary.receivedMinor, 350025);
const record = { id: "income", amountMinor: 350025, receivedAt: new Date("2026-10-04T00:00:00Z"), title: "What's The Place?", tag: { name: "Материалы" }, receiptUrl: "https://example.com/receipt", comment: "Продажа комплекта" };
beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.overview.mockResolvedValue({ student: { rows: [], summary }, other: { records: [record], tags: [{ id: "tag", name: "Материалы", normalizedName: "материалы" }], receivedMinor: 350025 }, cash });
});
afterEach(() => vi.unstubAllGlobals());
const rubles = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(minor / 100);
describe("Finance v1 workspace", () => {
  it("exposes Finance and both tabs while retaining student payment KPIs", async () => {
    const html = renderToStaticMarkup(await PaymentsPage({ searchParams: Promise.resolve({ month: "2026-10" }) }));
    for (const text of ["Финансы", "Оплаты учеников", "Другие доходы", "Получено", "Ожидается"]) expect(html).toContain(text);
    expect(html).not.toContain("Кредиты");
    expect(html).not.toContain("Заработано");
    expect(html).toContain(rubles(cash.totalReceivedMinor));
    expect(readFileSync("components/app-shell.tsx", "utf8")).toContain('["/payments", "Финансы", "payments"]');
  });
  it.each([["2026-10", 350025], ["2026-11", 72500]])("uses the service total for %s in the third KPI without merging student cash or credits", async (month, otherReceivedMinor) => {
    mocks.overview.mockResolvedValue({ student: { rows: [], summary }, other: { records: [], tags: [], receivedMinor: otherReceivedMinor }, cash: combinedMonthlyCash(summary.receivedMinor, otherReceivedMinor) });
    const html = renderToStaticMarkup(await PaymentsPage({ searchParams: Promise.resolve({ month }) }));
    const cards = [...html.matchAll(/<article class="finance-kpi-[^"]+">(.*?)<\/article>/g)].map((match) => match[1]);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toContain("Получено");
    expect(cards[0]).toContain(new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(summary.receivedMinor / 100));
    expect(cards[1]).toContain("Ожидается");
    expect(cards[2]).toBe(`<span>Другие доходы</span><strong>${rubles(otherReceivedMinor)}</strong>`);
    expect(summary.creditMinor).toBe(90000);
    expect(mocks.overview).toHaveBeenLastCalledWith(expect.objectContaining({ key: month }));
  });
  it("renders Other Income with shared totals, date/title/category/receipt and no billing states", async () => {
    const html = renderToStaticMarkup(await PaymentsPage({ searchParams: Promise.resolve({ tab: "other", month: "2026-10" }) }));
    for (const text of ["Название", "Категория", "Комментарий", "Материалы", "Продажа комплекта", rubles(350025), rubles(cash.totalReceivedMinor), "https://example.com/receipt", "editIncome=income"]) expect(html).toContain(text);
    for (const text of ["Ожидается", "Баланс", "Кредиты", "payment-status", "Заработано"]) expect(html).not.toContain(text);
    expect(html).toContain("tab=other");
  });
  it("provides required add fields and current-date default with independent category suggestions", async () => {
    const html = renderToStaticMarkup(await PaymentsPage({ searchParams: Promise.resolve({ tab: "other", month: "2026-10", addIncome: "1" }) }));
    for (const name of ["amount", "receivedAt", "title", "category", "receiptUrl", "comment"]) expect(html).toContain(`name=${String.fromCharCode(34)}${name}${String.fromCharCode(34)}`);
    expect((html.match(/required=/g) ?? []).length).toBe(4);
    expect(html).toContain("2026-10-13");
    expect(html).toContain("income-categories");
  });
  it("edit shows existing record and deletion has explicit confirmation", async () => {
    const html = renderToStaticMarkup(await PaymentsPage({ searchParams: Promise.resolve({ tab: "other", month: "2026-10", editIncome: "income" }) }));
    expect(html).toContain("Изменить доход"); expect(html).toContain("3500.25");
    const source = readFileSync("components/extra-income-workspace.tsx", "utf8");
    expect(source).toContain("Удалить доход «{record.title}»?");
    expect(source).toContain("Будет удалена только эта запись");
    expect(source).toContain("saveExtraIncome.bind(null, record?.id ?? null)");
    expect(source).toContain("deleteExtraIncome.bind(null, record.id)");
    expect(source).toContain("!records.some((record) => record.id === deleting.id)");
  });
});
