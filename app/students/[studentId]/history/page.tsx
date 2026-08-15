import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { dateLabel } from "@/lib/format";
import { lessonBelongsToStudent } from "@/lib/domain/student-profile";

export const dynamic = "force-dynamic";

export default async function StudentHistoryPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { memberships: { include: { cohort: true } } } });
  if (!student) notFound();
  const lessons = (await prisma.lesson.findMany({ where: { status: "COMPLETED", OR: [{ studentId }, { cohortId: { in: student.memberships.map(({ cohortId }) => cohortId) } }] }, include: { cohort: true, attendance: { where: { studentId } } }, orderBy: [{ scheduledDate: "desc" }, { startMinute: "desc" }] }))
    .filter((lesson) => lessonBelongsToStudent(lesson, studentId, student.memberships));
  return <div className="student-history"><header className="page-heading"><div><p className="eyebrow">Профиль ученика</p><h1>История · {student.name}</h1><p>Проведённые уроки, домашние задания и посещаемость.</p></div></header><section className="history-list">{lessons.map((lesson) => { const entity = lesson.studentId ? `student:${studentId}` : `cohort:${lesson.cohortId}`; const attendance = lesson.attendance[0]; return <Link href={`/lessons?entity=${entity}&lesson=${lesson.id}`} className="history-row" key={lesson.id}><time>{dateLabel(lesson.scheduledDate)}</time><div><strong>{lesson.title || "Урок без темы"}</strong><span>{lesson.cohort ? `${lesson.cohort.kind === "PAIR" ? "Пара" : "Группа"}: ${lesson.cohort.name}` : "Индивидуально"}</span></div><div><span className="lesson-history-status status-completed">Завершён{attendance ? ` · ${attendance.status === "PRESENT" ? "присутствовал" : attendance.status === "ABSENT" ? "отсутствовал" : "посещаемость отмечена"}` : ""}</span><small>{lesson.homeworkText ? `Д/з: ${lesson.homeworkText}` : "Д/з не добавлено"}</small></div></Link>; })}{!lessons.length && <div className="learning-empty">Завершённых уроков в истории пока нет.</div>}</section></div>;
}
