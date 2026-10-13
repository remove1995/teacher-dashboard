import { getFinanceWorkspace, type FinancePeriod } from "./finance-service";
import { getExtraIncomeWorkspace } from "./extra-income-service";
import { combinedMonthlyCash } from "../domain/extra-income";

export async function getFinanceOverview(period: FinancePeriod) {
  const [student, other] = await Promise.all([getFinanceWorkspace(period), getExtraIncomeWorkspace(period)]);
  return { student, other, cash: combinedMonthlyCash(student.summary.receivedMinor, other.receivedMinor) };
}
