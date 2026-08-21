import { notFound } from "next/navigation";
import { DemoStudentProfile } from "../../../../components/demo-student-profile";
import { demoStudentById, demoStudents } from "../../../../lib/demo/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return demoStudents.map(({ id }) => ({ studentId: id }));
}

export default async function StaticDemoStudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = demoStudentById(studentId);
  if (!student) notFound();
  return <DemoStudentProfile student={student} routePrefix="" />;
}
