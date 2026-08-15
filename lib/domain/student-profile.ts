export type StudentMembershipWindow = { cohortId: string; activeFrom: Date; activeTo: Date | null };
export type StudentHistoryLesson = { studentId: string | null; cohortId: string | null; scheduledDate: Date };

export function lessonBelongsToStudent(lesson: StudentHistoryLesson, studentId: string, memberships: StudentMembershipWindow[]) {
  if (lesson.studentId === studentId) return true;
  if (!lesson.cohortId) return false;
  return memberships.some((membership) => membership.cohortId === lesson.cohortId && membership.activeFrom <= lesson.scheduledDate && (!membership.activeTo || membership.activeTo >= lesson.scheduledDate));
}

export function financeContextsForStudent<P extends { studentId: string }, R extends { participants: P[] }>(rows: R[], studentId: string): Array<{row:R;participant:P}> {
  return rows.flatMap((row) => row.participants.filter((participant) => participant.studentId === studentId).map((participant) => ({ row, participant })));
}
