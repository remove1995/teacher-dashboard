import { DemoStudentsWorkspace } from "@/components/demo-students-workspace";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function DemoStudentsPage() {
  return <PagePlaceholder title="Ученики"><DemoStudentsWorkspace routePrefix="/demo" /></PagePlaceholder>;
}
