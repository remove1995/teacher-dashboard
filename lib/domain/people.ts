export const STUDENT_EDITABLE_FIELDS = ["name", "yearOrLevel", "status", "color", "tags", "billingModel", "rate", "notesPrivate", "imageUrl"] as const;
export const COHORT_EDITABLE_FIELDS = ["name", "kind", "color", "tags", "activeFrom", "activeTo", "defaultRate", "memberships", "participantBillingModel", "participantRate"] as const;

export function normalizeTags(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
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
