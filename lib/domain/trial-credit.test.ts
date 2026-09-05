import { describe, expect, it } from "vitest";
import { splitCreditApplication, trialConversionAmounts } from "./trial-credit";

describe("trial payment credit", () => {
  it("leaves a trial-only payment standalone when no conversion credit is requested", () => expect(trialConversionAmounts(150000, 600000, false)).toEqual({ creditMinor: 0, remainingMinor: 600000, excessMinor: 0 }));
  it("credits trial payment toward the first subscription", () => expect(trialConversionAmounts(150000, 600000, true)).toEqual({ creditMinor: 150000, remainingMinor: 450000, excessMinor: 0 }));
  it("calculates a partial-credit outstanding balance", () => expect(trialConversionAmounts(150000, 600000, true).remainingMinor).toBe(450000));
  it("supports a full-credit subscription", () => expect(trialConversionAmounts(600000, 600000, true).remainingMinor).toBe(0));
  it("never creates a negative balance", () => expect(trialConversionAmounts(750000, 600000, true)).toEqual({ creditMinor: 600000, remainingMinor: 0, excessMinor: 150000 }));
  it("keeps excess as a separate available remainder", () => expect(splitCreditApplication(750000, 600000)).toEqual({ appliedMinor: 600000, remainingMinor: 150000 }));
  it("consumes a smaller credit completely", () => expect(splitCreditApplication(150000, 600000)).toEqual({ appliedMinor: 150000, remainingMinor: 0 }));
  it("does not allocate more than requested", () => expect(splitCreditApplication(150000, 100000).appliedMinor).toBe(100000));
  it("rejects invalid monetary values", () => expect(() => trialConversionAmounts(-1, 600000, true)).toThrow());
});
