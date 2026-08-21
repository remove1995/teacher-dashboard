import { notFound } from "next/navigation";
import { DemoStudentProfile } from "@/components/demo-student-profile";
import { demoStudentById } from "@/lib/demo/data";

export default async function DemoStudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = demoStudentById(studentId);
  if (!student) notFound();
  return <DemoStudentProfile student={student} routePrefix="/demo" />;
}
