export type MemberStatus = "REGULAR" | "TRIAL";

export function memberAttendsOccurrence(member: { status: MemberStatus; activeFrom: Date; activeTo: Date | null; trialLessonDate: Date | null; regularFrom?: Date | null }, date: Date) {
  if (member.activeFrom > date || (member.activeTo && member.activeTo < date)) return false;
  return (member.status === "REGULAR" && (!member.regularFrom || member.regularFrom <= date)) || member.trialLessonDate?.getTime() === date.getTime();
}

export function validateMemberBilling(input: { status: MemberStatus; model: string; trialLessonDate: string | null }) {
  if (input.status === "TRIAL" && input.model !== "PAY_PER_LESSON") throw new Error("Для пробного участника используется разовая оплата за урок");
  if (input.status === "TRIAL" && !input.trialLessonDate) throw new Error("Укажите дату пробного урока");
}

export function shouldRequestBillingEffectiveDate(input: { isExisting: boolean; status: MemberStatus; initialModel?: string; initialAmountMinor?: number; model: string; amountMinor: number }) {
  return input.isExisting
    && input.status !== "TRIAL"
    && (input.model !== input.initialModel || input.amountMinor !== input.initialAmountMinor);
}
