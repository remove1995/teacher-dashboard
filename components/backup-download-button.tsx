"use client";

import { useState } from "react";
import { backupPreview, parseTutorFlowBackupJson, type TutorFlowBackup } from "@/lib/backup-format";

function responseFileName(disposition: string | null) {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "tutorflow-backup.json";
}

export function BackupDownloadButton() {
  const [state, setState] = useState<"idle" | "loading" | "restoring">("idle");
  const [backup, setBackup] = useState<TutorFlowBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const download = async (fileName?: string) => {
    setState("loading");
    try {
      const response = await fetch("/settings/backup", { method: "GET", credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Backup request failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName ?? responseFileName(response.headers.get("Content-Disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setState("idle");
      setError(null);
      return true;
    } catch {
      setState("idle");
      setError("Не удалось скачать резервную копию. Попробуйте ещё раз.");
      return false;
    }
  };

  const selectFile = async (file: File | undefined) => {
    setBackup(null); setConfirmed(false); setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) { setError("Выберите резервную копию в формате .json."); return; }
    if (file.size > 25 * 1024 * 1024) { setError("Файл резервной копии слишком большой."); return; }
    const validation = parseTutorFlowBackupJson(await file.text());
    if (!validation.ok) { setError(validation.error); return; }
    setBackup(validation.backup);
  };

  const restore = async () => {
    if (!backup || !confirmed) return;
    if (!window.confirm("Текущие данные TutorFlow будут заменены данными из резервной копии.")) return;
    setState("restoring"); setError(null);
    const stamp = new Date().toISOString().replace(/T/, "-").replace(/:/g, "").slice(0, 15);
    if (!await download(`tutorflow-pre-restore-${stamp}.json`)) return;
    setState("restoring");
    try {
      const response = await fetch("/settings/restore", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(backup) });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Восстановление не выполнено.");
      window.location.assign("/settings?restored=1");
    } catch (reason) {
      setState("idle"); setError(reason instanceof Error ? reason.message : "Восстановление не выполнено. Текущие данные не были заменены.");
    }
  };

  const preview = backup ? backupPreview(backup) : null;

  return <div className="settings-backup-control">
    <button className="secondary-button" type="button" disabled={state !== "idle"} onClick={() => void download()}>
      {state === "loading" ? "Подготавливаем копию…" : "Скачать резервную копию"}
    </button>
    <p>Скачивает все данные TutorFlow в один файл.<br />Пароли и другие секретные данные в резервную копию не входят.</p>
    <div className="settings-restore-control">
      <label className="secondary-button settings-restore-file">Восстановить из копии<input type="file" accept=".json,application/json" disabled={state !== "idle"} onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
      {preview && <div className="settings-restore-preview">
        <strong>Резервная копия готова к проверке</strong>
        <p>Другие доходы: {preview.extraIncomes} · Категории доходов: {preview.incomeTags}</p>
        <dl><div><dt>Создана</dt><dd>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.createdAt))}</dd></div><div><dt>Версия</dt><dd>{preview.version}</dd></div><div><dt>Ученики</dt><dd>{preview.students}</dd></div><div><dt>Пары и группы</dt><dd>{preview.cohorts}</dd></div><div><dt>Уроки</dt><dd>{preview.lessons}</dd></div><div><dt>Расписания</dt><dd>{preview.schedules}</dd></div><div><dt>Оплаты</dt><dd>{preview.payments}</dd></div><div><dt>Учебные записи</dt><dd>{preview.learningRecords}</dd></div></dl>
        <label className="settings-restore-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Я понимаю, что текущие данные TutorFlow будут заменены данными из резервной копии.</span></label>
        <button className="danger-button" type="button" disabled={!confirmed || state !== "idle"} onClick={() => void restore()}>{state === "restoring" ? "Восстанавливаем…" : "Восстановить данные"}</button>
      </div>}
    </div>
    {error && <p className="settings-backup-error" role="alert">{error}</p>}
  </div>;
}
