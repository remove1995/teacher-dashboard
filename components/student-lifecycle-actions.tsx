"use client";

import { archiveStudent, deleteStudentForever } from "@/app/actions/people";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type LifecycleAction = "archive" | "delete";

export function StudentLifecycleActions({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<LifecycleAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen && !dialog) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) { setMenuOpen(false); setDialog(null); setError(null); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen, dialog, pending]);

  const openDialog = (action: LifecycleAction) => { setMenuOpen(false); setError(null); setDialog(action); };
  const confirm = () => {
    if (!dialog) return;
    const action = dialog;
    setError(null);
    startTransition(async () => {
      try {
        if (action === "archive") await archiveStudent(studentId);
        else await deleteStudentForever(studentId);
        router.replace("/students");
        router.refresh();
      } catch (cause) {
        console.error(`Failed to ${action} student`, cause);
        setError(action === "archive" ? "Не удалось архивировать ученика." : "Не удалось удалить ученика. Связанные данные не были изменены.");
      }
    });
  };

  return <div className="student-lifecycle-menu" ref={rootRef}>
    <button className="student-lifecycle-trigger" type="button" aria-label="Действия с учеником" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>•••</button>
    {menuOpen ? <div className="student-lifecycle-popover" role="menu">
      <button type="button" role="menuitem" onClick={() => openDialog("archive")}>Архивировать ученика</button>
      <span className="student-lifecycle-separator" />
      <button className="student-lifecycle-delete" type="button" role="menuitem" onClick={() => openDialog("delete")}>Удалить навсегда</button>
    </div> : null}
    {dialog ? <div className="student-lifecycle-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setDialog(null); }}>
      <section className="student-lifecycle-dialog" role="dialog" aria-modal="true" aria-labelledby="student-lifecycle-title">
        <h2 id="student-lifecycle-title">{dialog === "archive" ? `Архивировать ${studentName}?` : `Удалить ${studentName} навсегда?`}</h2>
        <p>{dialog === "archive" ? "Ученик исчезнет из активного списка, но уроки, оплаты и история сохранятся." : "Профиль и связанные данные будут удалены. Это действие нельзя отменить."}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <footer>
          <button className="secondary-button" type="button" disabled={pending} onClick={() => setDialog(null)}>Отмена</button>
          <button className={dialog === "delete" ? "danger-button" : "secondary-button"} type="button" disabled={pending} onClick={confirm}>{pending ? "Выполняем…" : dialog === "archive" ? "Архивировать" : "Удалить навсегда"}</button>
        </footer>
      </section>
    </div> : null}
  </div>;
}
