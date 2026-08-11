export type CreditDecision = {
  lessonWasPaid: boolean;
  willBeMadeUp: boolean;
  teacherConfirmed: boolean;
  context: "INDIVIDUAL" | "PAIR" | "GROUP_SUBSCRIPTION";
  groupLessonTookPlace?: boolean;
};

export function canCreateCredit(decision: CreditDecision) {
  if (!decision.lessonWasPaid || decision.willBeMadeUp || !decision.teacherConfirmed) return false;
  if (decision.context === "GROUP_SUBSCRIPTION" && decision.groupLessonTookPlace) return false;
  return decision.context === "INDIVIDUAL" || decision.context === "PAIR";
}
