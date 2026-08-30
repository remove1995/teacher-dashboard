export const STUDENT_EDITABLE_FIELDS = ["name", "yearOrLevel", "status", "color", "tags", "learningContexts", "contextBilling", "contextEffectiveFrom", "notesPrivate", "imageUrl"] as const;
export const COHORT_EDITABLE_FIELDS = ["name", "kind", "imageUrl", "color", "tags", "activeFrom", "activeTo", "defaultRate", "memberships", "participantBillingModel", "participantRate"] as const;

export function normalizeTags(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export function hasIndividualLearningContext(student: {
  individualSchedules: readonly unknown[];
  billingProfiles: readonly unknown[];
}) {
  return student.individualSchedules.length > 0 || student.billingProfiles.length > 0;
}

export function planMembershipChanges(existingIds: string[], selectedIds: string[]) {
  const existing = new Set(existingIds);
  const selected = new Set(selectedIds);
  return {
    added: [...selected].filter((id) => !existing.has(id)),
    retained: [...selected].filter((id) => existing.has(id)),
    removed: [...existing].filter((id) => !selected.has(id)),
  };
}

export type CohortParticipantDraft = { mode: "existing" | "new"; studentId?: string | null; name?: string | null };

export function validateCohortParticipants(kind: "PAIR" | "GROUP", participants: CohortParticipantDraft[]) {
  if (kind === "PAIR" && participants.length !== 2) throw new Error("A pair must contain exactly two active members");
  if (kind === "GROUP" && participants.length < 2) throw new Error("A group must contain at least two active members");
  const existingIds = participants.filter(({ mode }) => mode === "existing").map(({ studentId }) => studentId?.trim() ?? "");
  if (existingIds.some((id) => !id)) throw new Error("Select an existing student for every participant row");
  if (new Set(existingIds).size !== existingIds.length) throw new Error("The same student cannot be added twice");
  const newNames = participants.filter(({ mode }) => mode === "new").map(({ name }) => name?.trim() ?? "");
  if (newNames.some((name) => !name)) throw new Error("Enter a name for every new student");
  const normalizedNames = newNames.map((name) => name.toLocaleLowerCase("ru"));
  if (new Set(normalizedNames).size !== normalizedNames.length) throw new Error("The same new student cannot be added twice");
  return participants;
}

export function contextActiveInPeriod(activeFrom: Date, activeTo: Date | null, periodStart: Date, periodEnd: Date) {
  return activeFrom <= periodEnd && (!activeTo || activeTo >= periodStart);
}

export type BillableContextInput = {
  studentId: string;
  individualBillingActive: boolean;
  memberships: Array<{ cohortId: string; kind: "PAIR" | "GROUP"; activeFrom: Date; activeTo: Date | null; billingActive: boolean }>;
};

export function billableContextKeys(input: BillableContextInput, periodStart: Date, periodEnd: Date) {
  const keys: Array<{ key: string; kind: "INDIVIDUAL" | "PAIR" | "GROUP" }> = [];
  if (input.individualBillingActive) keys.push({ key: `${input.studentId}:individual`, kind: "INDIVIDUAL" });
  for (const membership of input.memberships) {
    if (membership.billingActive && contextActiveInPeriod(membership.activeFrom, membership.activeTo, periodStart, periodEnd)) {
      keys.push({ key: `${input.studentId}:${membership.cohortId}`, kind: membership.kind });
    }
  }
  return keys;
}
