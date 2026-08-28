"use client";

import { archiveStudent, deleteStudentForever } from "@/app/actions/people";

export function StudentLifecycleActions({ studentId, studentName }: { studentId: string; studentName: string }) {
  return <div className="student-lifecycle-actions">
    <form action={archiveStudent.bind(null, studentId)} onSubmit={(event) => {
      if (!window.confirm(`Архивировать ученика «${studentName}»? Ученик исчезнет из активного списка, но все связанные данные сохранятся.`)) event.preventDefault();
    }}><button className="secondary-button" type="submit">Архивировать ученика</button></form>
    <details className="student-danger-menu">
      <summary>Другие действия</summary>
      <form action={deleteStudentForever.bind(null, studentId)} onSubmit={(event) => {
        if (!window.confirm(`Удалить ученика «${studentName}» навсегда? Будут удалены его уроки, посещаемость, оплаты, учебные записи и остальные связанные данные. Это действие нельзя отменить.`)) event.preventDefault();
      }}><button className="danger-button" type="submit">Удалить навсегда</button></form>
    </details>
  </div>;
}
