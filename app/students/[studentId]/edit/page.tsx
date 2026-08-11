import { notFound } from "next/navigation";
import { updateStudent } from "@/app/actions/people";
import { StudentForm } from "@/components/student-form";
import { prisma } from "@/lib/db/prisma";
export default async function EditStudentPage({ params }: { params: Promise<{ studentId: string }> }) { const { studentId } = await params; const student = await prisma.student.findUnique({ where: { id: studentId }, include: { tags: { include: { tag: true } }, billingProfiles: { where: { cohortId: null }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }); if (!student) notFound(); return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Настройки ученика</p><h1>{student.name}</h1></div></section><StudentForm action={updateStudent.bind(null, student.id)} values={{ ...student, tags: student.tags.map(({tag}) => tag.name), billing: student.billingProfiles[0] }} /></div>; }
