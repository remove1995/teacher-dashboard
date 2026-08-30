"use client";

import { useState } from "react";
import { AvatarImage } from "@/components/avatar-image";

export function TeacherAvatarUrlField({ initialUrl, fallback }: { initialUrl?: string | null; fallback: string }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl ?? "");
  return <div className="settings-profile-fields">
    <div className="settings-avatar-preview"><AvatarImage src={avatarUrl.trim()} fallback={fallback} alt="Предпросмотр аватара" /></div>
    <div className="settings-avatar-controls">
      <label className="field"><span>Аватар (URL)</span><input name="avatarUrl" type="url" inputMode="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.currentTarget.value)} placeholder="https://example.com/avatar.jpg" /><small>Прямая ссылка на изображение по HTTPS или HTTP.</small></label>
    </div>
  </div>;
}
