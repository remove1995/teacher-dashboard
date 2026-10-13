"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ExtraIncomeValidationError, incomeAmountMinor, incomeDate } from "@/lib/domain/extra-income";
import { deleteExtraIncomeRecord, saveExtraIncomeRecord } from "@/lib/services/extra-income-service";
import type { ActionState } from "@/lib/action-state";

async function requireIncomeSession() {
  const store = await cookies();
  if (!await verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value, process.env.TUTORFLOW_SESSION_SECRET)) throw new Error("Требуется повторный вход в TutorFlow.");
}

export async function saveExtraIncome(id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireIncomeSession();
  let month: string;
  try {
    const saved = await saveExtraIncomeRecord(id, {
      amountMinor: incomeAmountMinor(String(form.get("amount") ?? "")), receivedAt: incomeDate(String(form.get("receivedAt") ?? "")),
      title: String(form.get("title") ?? ""), category: String(form.get("category") ?? ""), receiptUrl: String(form.get("receiptUrl") ?? ""), comment: String(form.get("comment") ?? ""),
    });
    month = saved.receivedAt.toISOString().slice(0, 7);
  } catch (error) {
    return { error: error instanceof ExtraIncomeValidationError ? error.message : "Не удалось сохранить доход. Данные не изменены." };
  }
  revalidatePath("/payments");
  redirect(`/payments?tab=other&month=${month}`);
}

export async function deleteExtraIncome(id: string, _state: ActionState, _form: FormData): Promise<ActionState> {
  await requireIncomeSession();
  let month: string;
  try { const deleted = await deleteExtraIncomeRecord(id); month = deleted.receivedAt.toISOString().slice(0, 7); }
  catch { return { error: "Не удалось удалить доход. Обновите страницу и попробуйте снова." }; }
  revalidatePath("/payments");
  redirect(`/payments?tab=other&month=${month}`);
}
