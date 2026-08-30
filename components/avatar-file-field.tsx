"use client";

import { useId, useState } from "react";

export function AvatarFileField() {
  const id = useId();
  const [fileName, setFileName] = useState("Файл не выбран");

  return <label className="field avatar-file-field" htmlFor={id}>
    <span>Аватар</span>
    <span className="avatar-file-control">
      <input id={id} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "Файл не выбран")} />
      <span className="avatar-file-button" aria-hidden="true">Выбрать файл</span>
      <span className="avatar-file-name" aria-live="polite">{fileName}</span>
    </span>
    <small>JPG, PNG или WebP, до 5 МБ.</small>
  </label>;
}
