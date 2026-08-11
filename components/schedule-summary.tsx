import { minuteToTime } from "@/lib/domain/dates";
import { dateLabel, weekdayLabels } from "@/lib/format";

type Slot = { id?: string; weekday: number; startMinute: number; durationMinutes: number };

function endTime(startMinute: number, durationMinutes: number) {
  return minuteToTime((startMinute + durationMinutes) % 1440);
}

export function ScheduleSummary({ slots, effectiveTo }: { slots: Slot[]; effectiveTo: Date | null }) {
  return <div className="recurring-summary">
    <div className="recurring-lines">{[...slots].sort((a,b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)).map((slot) => <div key={slot.id ?? slot.weekday}><strong>{weekdayLabels[slot.weekday]}</strong><span>{minuteToTime(slot.startMinute)}–{endTime(slot.startMinute, slot.durationMinutes)}</span></div>)}</div>
    <p>Действует до {effectiveTo ? dateLabel(effectiveTo) : "без даты окончания"}</p>
  </div>;
}
