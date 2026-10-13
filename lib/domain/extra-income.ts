export class ExtraIncomeValidationError extends Error {}

export const incomeCategoryName = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");
export const normalizeIncomeCategory = (value: string) => incomeCategoryName(value).toLocaleLowerCase("ru-RU");

export function incomeAmountMinor(value: string) {
  const text = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new ExtraIncomeValidationError("Сумма должна быть положительной, не более двух знаков после запятой.");
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 2147483647) throw new ExtraIncomeValidationError("Укажите положительную сумму в допустимом диапазоне.");
  return minor;
}

export function incomeDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ExtraIncomeValidationError("Укажите корректную дату получения.");
  return date;
}

export type ExtraIncomeInput = { amountMinor: number; receivedAt: Date; title: string; category: string; receiptUrl?: string | null; comment?: string | null };
export function validateExtraIncome(input: ExtraIncomeInput) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > 2147483647) throw new ExtraIncomeValidationError("Укажите положительную сумму.");
  if (!(input.receivedAt instanceof Date) || Number.isNaN(input.receivedAt.getTime()) || input.receivedAt.toISOString().slice(11) !== "00:00:00.000Z") throw new ExtraIncomeValidationError("Укажите корректную дату получения.");
  const title = input.title.trim(), category = incomeCategoryName(input.category);
  if (!title || title.length > 200) throw new ExtraIncomeValidationError("Укажите название до 200 символов.");
  if (!category || category.length > 80) throw new ExtraIncomeValidationError("Укажите категорию до 80 символов.");
  const receiptUrl = input.receiptUrl?.trim() || null;
  if (receiptUrl) {
    try { const url = new URL(receiptUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch { throw new ExtraIncomeValidationError("Ссылка на чек должна начинаться с http:// или https://."); }
  }
  const comment = input.comment?.trim() || null;
  if (comment && comment.length > 5000) throw new ExtraIncomeValidationError("Комментарий слишком длинный.");
  return { amountMinor: input.amountMinor, receivedAt: input.receivedAt, title, category, receiptUrl, comment };
}

export function monthlyExtraIncomeTotal(records: Array<{ amountMinor: number; receivedAt: Date }>, start: Date, end: Date) {
  return records.filter((row) => row.receivedAt >= start && row.receivedAt <= end).reduce((sum, row) => {
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) throw new Error("Invalid income amount");
    const total = sum + row.amountMinor;
    if (!Number.isSafeInteger(total)) throw new Error("Income total exceeds safe integer range");
    return total;
  }, 0);
}

export function combinedMonthlyCash(studentReceivedMinor: number, otherReceivedMinor: number) {
  if (![studentReceivedMinor, otherReceivedMinor, studentReceivedMinor + otherReceivedMinor].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error("Invalid cash total");
  return { studentReceivedMinor, otherReceivedMinor, totalReceivedMinor: studentReceivedMinor + otherReceivedMinor };
}
