export const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2020, index, 1)));
export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function parsePublicationDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getCalendarDays(month: Date) {
  const firstDayOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: Array<Date | null> = Array.from({ length: firstDayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) days.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function isSameCalendarDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

export function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

export function formatPublishDate(value: string) {
  const date = parsePublicationDate(value);
  if (!date) return "Immediately";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatPublicationTimezone(date: Date) {
  // The picker edits local calendar fields; use the offset at this date for DST.
  const offset = -date.getTimezoneOffset();
  if (!Number.isFinite(offset)) return "Local time";
  const magnitude = Math.abs(offset);
  const hours = Math.floor(magnitude / 60);
  const minutes = magnitude % 60;
  return `UTC${offset < 0 ? "−" : "+"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}
