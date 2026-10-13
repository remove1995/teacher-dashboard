import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authenticated: false, save: vi.fn(), remove: vi.fn(), refresh: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/auth/session", () => ({ SESSION_COOKIE_NAME: "tutorflow_session", verifySessionToken: async () => mocks.authenticated }));
vi.mock("@/lib/domain/extra-income", async () => import("./domain/extra-income"));
vi.mock("@/lib/services/extra-income-service", () => ({ saveExtraIncomeRecord: mocks.save, deleteExtraIncomeRecord: mocks.remove }));
import { saveExtraIncome, deleteExtraIncome } from "../app/actions/extra-income";

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ amount: "35.29", receivedAt: "2026-10-04", title: "Material", category: "Материалы", receiptUrl: "https://example.com", comment: "Sale" })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.clearAllMocks(); mocks.authenticated = true; mocks.save.mockResolvedValue({ id: "income", receivedAt: new Date("2026-10-04T00:00:00Z") }); mocks.remove.mockResolvedValue({ receivedAt: new Date("2026-10-04T00:00:00Z") }); });
describe("income Server Actions", () => {
  it("requires authentication before create/update/delete", async () => {
    mocks.authenticated = false;
    await expect(saveExtraIncome(null, { error: null }, form())).rejects.toThrow("Требуется повторный вход");
    await expect(saveExtraIncome("id", { error: null }, form())).rejects.toThrow();
    await expect(deleteExtraIncome("id", { error: null }, new FormData())).rejects.toThrow();
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("validates amount/date server-side without calling persistence", async () => {
    const data = form(); data.set("amount", "0");
    expect((await saveExtraIncome(null, { error: null }, data)).error).toBeTruthy();
    data.set("amount", "1"); data.set("receivedAt", "2026-02-30");
    expect((await saveExtraIncome(null, { error: null }, data)).error).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([null, "existing-income"])("passes the existing identity for edit, or null for create: %s", async (id) => {
    await expect(saveExtraIncome(id, { error: null }, form())).rejects.toThrow("REDIRECT:/payments?tab=other&month=2026-10");
    expect(mocks.save).toHaveBeenCalledWith(id, expect.objectContaining({ amountMinor: 3529, title: "Material", category: "Материалы" }));
    expect(mocks.refresh).toHaveBeenCalledWith("/payments");
  });
  it("deletes only the specified income and reopens its month", async () => {
    await expect(deleteExtraIncome("income-only", { error: null }, new FormData())).rejects.toThrow("REDIRECT:/payments?tab=other&month=2026-10");
    expect(mocks.remove).toHaveBeenCalledWith("income-only");
  });
  it("returns safe errors without redirecting on persistence failure", async () => {
    mocks.save.mockRejectedValue(new Error("internal")); mocks.remove.mockRejectedValue(new Error("internal"));
    expect((await saveExtraIncome(null, { error: null }, form())).error).not.toContain("internal");
    expect((await deleteExtraIncome("id", { error: null }, new FormData())).error).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
