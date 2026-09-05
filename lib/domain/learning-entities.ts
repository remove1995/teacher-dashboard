import { hasIndividualLearningContext } from "./people";

export type LearningEntity = {
  value: string;
  label: string;
  kind: "Ученик" | "Пара" | "Группа";
  color: string;
  type: "student" | "cohort";
  id: string;
};

type StudentCandidate = {
  id: string;
  name: string;
  color: string;
  individualSchedules: readonly unknown[];
  billingProfiles: readonly unknown[];
};

type CohortCandidate = {
  id: string;
  name: string;
  color: string;
  kind: "PAIR" | "GROUP";
};

export function buildLearningEntities(students: readonly StudentCandidate[], cohorts: readonly CohortCandidate[]) {
  const entities: LearningEntity[] = [
    ...students.filter(hasIndividualLearningContext).map((student) => ({
      value: `student:${student.id}`,
      label: student.name,
      kind: "Ученик" as const,
      color: student.color,
      type: "student" as const,
      id: student.id,
    })),
    ...cohorts.map((cohort) => ({
      value: `cohort:${cohort.id}`,
      label: cohort.name,
      kind: cohort.kind === "PAIR" ? "Пара" as const : "Группа" as const,
      color: cohort.color,
      type: "cohort" as const,
      id: cohort.id,
    })),
  ];
  return [...new Map(entities.map((entity) => [entity.value, entity])).values()];
}
