import { saveTeacherSettings } from "@/app/settings/actions";
import { getTeacherSettings } from "@/lib/settings";
import { TeacherAvatarUrlField } from "@/components/teacher-avatar-url-field";
import { BackupDownloadButton } from "@/components/backup-download-button";

type Search = { saved?: string; restored?: string; error?: string };
const errors: Record<string, string> = {
  name: "Укажите имя длиной до 80 символов.",
  timezone: "Укажите корректный часовой пояс.",
  duration: "Длительность должна быть от 15 до 240 минут.",
  "avatar-url": "Укажите корректную прямую ссылку на изображение.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [settings, search] = await Promise.all([getTeacherSettings(), searchParams]);
  return <div className="page-stack settings-page">
    <header className="page-heading"><h1>Настройки</h1></header>
    {search.saved === "1" && <p className="settings-feedback settings-feedback-success" role="status">Настройки сохранены.</p>}
    {search.restored === "1" && <p className="settings-feedback settings-feedback-success" role="status">Данные восстановлены из резервной копии.</p>}
    {search.error && <p className="settings-feedback settings-feedback-error" role="alert">{errors[search.error] ?? "Не удалось сохранить настройки."}</p>}
    <form action={saveTeacherSettings} className="settings-form">
      <section className="settings-section">
        <div><h2>Профиль преподавателя</h2></div>
        <div className="settings-avatar-controls">
          <label className="field"><span>Отображаемое имя</span><input name="displayName" required maxLength={80} defaultValue={settings.displayName} /></label>
          <TeacherAvatarUrlField initialUrl={settings.avatarUrl} fallback={settings.displayName.slice(0, 1).toUpperCase()} />
        </div>
      </section>
      <section className="settings-section">
        <div><h2>Занятия</h2></div>
        <div className="settings-fields">
          <label className="field"><span>Часовой пояс</span><input name="timezone" required defaultValue={settings.timezone} /></label>
          <label className="field"><span>Длительность урока по умолчанию</span><input name="defaultLessonDuration" type="number" required min={15} max={240} step={5} defaultValue={settings.defaultLessonDuration} /><small>Используется только для новых уроков и расписаний.</small></label>
        </div>
      </section>
      <section className="settings-section">
        <div><h2>Финансы</h2></div>
        <label className="field"><span>Валюта</span><input value={`${settings.currency} / ₽`} readOnly aria-readonly="true" /><small>В бета-версии расчёты ведутся только в рублях.</small></label>
      </section>
      <section className="settings-section settings-data-section">
        <div><h2>Данные</h2></div>
        <BackupDownloadButton />
      </section>
      <footer className="settings-actions"><button type="submit">Сохранить изменения</button></footer>
    </form>
  </div>;
}
