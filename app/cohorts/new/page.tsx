import { prisma } from "@/lib/db/prisma";
import { createCohort } from "@/app/actions/people";
import { CohortForm } from "@/components/cohort-form";
export default async function NewCohortPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) { const query = await searchParams; const kind = query.kind === "PAIR" ? "PAIR" : "GROUP"; const students = await prisma.student.findMany({ where: { status: { not: "COMPLETED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }); return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Новый формат</p><h1>{kind === "PAIR" ? "Создать пару" : "Создать группу"}</h1></div></section><CohortForm action={createCohort} students={students} initialKind={kind} /></div>; }
