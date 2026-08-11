import { createStudent } from "@/app/actions/people";
import { StudentForm } from "@/components/student-form";
export default function NewStudentPage() { return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Новая запись</p><h1>Добавить ученика</h1><p className="lede">Создайте личную карточку и индивидуальный профиль оплаты.</p></div></section><StudentForm action={createStudent} /></div>; }
