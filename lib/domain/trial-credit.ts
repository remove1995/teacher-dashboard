export function trialConversionAmounts(trialPaidMinor: number, subscriptionPriceMinor: number, applyCredit: boolean) {
  for (const [name, value] of [["trialPaidMinor", trialPaidMinor], ["subscriptionPriceMinor", subscriptionPriceMinor]] as const) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  }
  const creditMinor = applyCredit ? Math.min(trialPaidMinor, subscriptionPriceMinor) : 0;
  return { creditMinor, remainingMinor: subscriptionPriceMinor - creditMinor, excessMinor: applyCredit ? Math.max(0, trialPaidMinor - subscriptionPriceMinor) : 0 };
}

export function splitCreditApplication(creditMinor: number, requestedMinor: number) {
  if (!Number.isSafeInteger(creditMinor) || creditMinor < 0 || !Number.isSafeInteger(requestedMinor) || requestedMinor < 0) throw new Error("credit amounts must be non-negative integers");
  const appliedMinor = Math.min(creditMinor, requestedMinor);
  return { appliedMinor, remainingMinor: creditMinor - appliedMinor };
}
