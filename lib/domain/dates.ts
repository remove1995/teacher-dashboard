export function dateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Date must use YYYY-MM-DD format");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");
  return parsed;
}

export function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function previousDate(value: string) {
  const parsed = dateOnly(value);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return toDateInput(parsed);
}

export function todayDate(timezone = "UTC") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function timeToMinute(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Time must use HH:mm format");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("Invalid time");
  return hours * 60 + minutes;
}

export function minuteToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
