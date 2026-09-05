import { notFound } from "next/navigation";
import { updateStudent } from "@/app/actions/people";
import { StudentForm } from "@/components/student-form";
import { prisma } from "@/lib/db/prisma";

export default async function EditStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const [student, cohorts] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, include: { tags: { include: { tag: true } }, billingProfiles: { orderBy: { effectiveFrom: "desc" } }, memberships: { orderBy: { activeFrom: "desc" }, include: { billingProfiles: { orderBy: { effectiveFrom: "desc" } } } } } }),
    prisma.cohort.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], select: { id: true, name: true, kind: true, defaultRateMinor: true } }),
  ]);
  if (!student) notFound();
  const now = new Date();
  const activeBilling = (cohortId: string | null) => student.billingProfiles.find((profile) => profile.cohortId === cohortId && profile.effectiveFrom <= now && (!profile.effectiveTo || profile.effectiveTo >= now));
  return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Настройки ученика</p><h1>{student.name}</h1></div></section><StudentForm action={updateStudent.bind(null, student.id)} cohorts={cohorts} values={{ ...student, tags: student.tags.map(({ tag }) => tag.name), individualBilling: activeBilling(null), memberships: student.memberships.map((membership) => ({ ...membership, billing: membership.billingProfiles.find((profile) => profile.effectiveFrom <= now && (!profile.effectiveTo || profile.effectiveTo >= now)) })) }}/></div>;
}
