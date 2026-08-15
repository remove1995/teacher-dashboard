import Link from "next/link";
import { notFound } from "next/navigation";
import { LearningProfileWorkspace } from "@/components/learning-profile-workspace";
import { prisma } from "@/lib/db/prisma";
import type { LearningEntry, LearningEntryType } from "@/lib/domain/learning";

export const dynamic = "force-dynamic";

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const decimal = (value: { toNumber(): number } | null) => value?.toNumber() ?? null;

export default async function LearningProfilePage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ type?: string; add?: string; edit?: string }> }) {
  const { studentId } = await params;
  const query = await searchParams;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      memberships: { include: { cohort: true }, orderBy: { activeFrom: "desc" } },
      learningRecords: { include: { attachments: true, cohort: true, sourceLesson: true } },
      testResults: { include: { attachments: true, cohort: true, sourceLesson: true } },
    },
  });
  if (!student) notFound();

  const cohortIds = [...new Set(student.memberships.map((membership) => membership.cohortId))];
  const lessons = await prisma.lesson.findMany({
    where: { OR: [{ studentId }, { cohortId: { in: cohortIds } }] },
    orderBy: { scheduledDate: "desc" },
    take: 120,
    include: { cohort: true },
  });
  const lessonProjection = (lesson: { scheduledDate: Date; title: string | null; studentId: string | null; cohortId: string | null }) => ({
    date: isoDate(lesson.scheduledDate),
    title: lesson.title || "Урок без темы",
    entityKey: lesson.studentId ? `student:${lesson.studentId}` : `cohort:${lesson.cohortId}`,
  });
  const entries: LearningEntry[] = [
    ...student.learningRecords.map((record) => ({
      id: record.id, type: record.kind as LearningEntryType, date: isoDate(record.entryDate), title: record.title,
      content: record.content, note: record.note, score: null, maxScore: null, percentage: null,
      sourceLessonId: record.sourceLessonId, cohortId: record.cohortId, contextName: record.cohort?.name ?? null,
      sourceLesson: record.sourceLesson ? lessonProjection(record.sourceLesson) : null,
      attachments: record.attachments.map(({ fileName, externalUrl, mediaType }) => ({ fileName, externalUrl, mediaType })),
    })),
    ...student.testResults.map((record) => ({
      id: record.id, type: "TEST" as const, date: isoDate(record.testDate), title: record.title,
      content: null, note: record.comment, score: decimal(record.score), maxScore: decimal(record.maxScore), percentage: decimal(record.percentage),
      sourceLessonId: record.sourceLessonId, cohortId: record.cohortId, contextName: record.cohort?.name ?? null,
      sourceLesson: record.sourceLesson ? lessonProjection(record.sourceLesson) : null,
      attachments: record.attachments.map(({ fileName, externalUrl, mediaType }) => ({ fileName, externalUrl, mediaType })),
    })),
  ];
  const validTypes: LearningEntryType[] = ["VOCABULARY", "GRAMMAR_FUNCTION", "NOTE", "TEST"];
  const addType = validTypes.includes(query.add as LearningEntryType) ? query.add as LearningEntryType : undefined;
  const activeType = validTypes.includes(query.type as LearningEntryType) ? query.type as LearningEntryType : "ALL";

  return <div className="learning-profile-page">
    <header className="page-heading learning-heading"><div><p className="eyebrow">Профиль ученика</p><h1>Обучение · {student.name}</h1><p>Материал, наблюдения и результаты в одной хронологии.</p></div><Link className="secondary-button" href={`/students/${student.id}`}>К профилю</Link></header>
    <LearningProfileWorkspace
      studentId={student.id}
      studentName={student.name}
      entries={entries}
      lessons={lessons.map((lesson) => ({ id: lesson.id, ...lessonProjection(lesson), contextName: lesson.cohort?.name ?? null }))}
      activeType={activeType}
      addType={addType}
      editKey={query.edit}
    />
  </div>;
}
