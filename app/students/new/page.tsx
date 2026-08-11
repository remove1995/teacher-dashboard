import { createStudent } from "@/app/actions/people";
import { StudentForm } from "@/components/student-form";
import { prisma } from "@/lib/db/prisma";

export default async function NewStudentPage() {
  const cohorts = await prisma.cohort.findMany({ where: { OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }] }, orderBy: [{ kind: "asc" }, { name: "asc" }], select: { id: true, name: true, kind: true, defaultRateMinor: true } });
  return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Новая запись</p><h1>Добавить ученика</h1><p className="lede">Создайте карточку, выберите один или несколько форматов обучения и задайте оплату для каждого контекста.</p></div></section><StudentForm action={createStudent} cohorts={cohorts}/></div>;
}
