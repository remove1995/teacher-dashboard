import { PagePlaceholder } from "@/components/page-placeholder";
import { demoSettings } from "@/lib/demo/data";

export default function DemoSettingsPage() {
  return <PagePlaceholder title="Настройки">
    <section className="settings-section demo-settings-section"><div><h2>Профиль преподавателя</h2></div><div className="settings-fields"><label className="field"><span>Отображаемое имя</span><input value={demoSettings.teacherName} readOnly /></label><label className="field"><span>Часовой пояс</span><input value={demoSettings.timezone} readOnly /></label></div></section>
    <section className="settings-section demo-settings-section"><div><h2>Настройки занятий</h2></div><div className="settings-fields"><label className="field"><span>Длительность по умолчанию</span><input value={`${demoSettings.defaultLessonDuration} минут`} readOnly /></label><label className="field"><span>Валюта</span><input value={`${demoSettings.currency} / ₽`} readOnly /></label><label className="field"><span>Плотность интерфейса</span><input value={demoSettings.interfaceDensity} readOnly /></label></div></section>
    <div className="demo-settings-note">Изменение настроек доступно в полной версии.</div>
  </PagePlaceholder>;
}
