export const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1))));
export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function parsePublicationDate(value?: string) {
  if (!value) return null;
  const utcValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value}Z` : value;
  const date = new Date(utcValue);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function makePublicationDate(year: number, month: number, day: number, hours = 0, minutes = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

export function startOfMonth(date: Date) {
  return makePublicationDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function getCalendarDays(month: Date) {
  const firstDayOffset = (makePublicationDate(month.getUTCFullYear(), month.getUTCMonth(), 1).getUTCDay() + 6) % 7;
  const daysInMonth = makePublicationDate(month.getUTCFullYear(), month.getUTCMonth() + 1, 0).getUTCDate();
  const days: Array<Date | null> = Array.from({ length: firstDayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) days.push(makePublicationDate(month.getUTCFullYear(), month.getUTCMonth(), day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function isSameCalendarDay(first: Date, second: Date) {
  return first.getUTCFullYear() === second.getUTCFullYear() && first.getUTCMonth() === second.getUTCMonth() && first.getUTCDate() === second.getUTCDate();
}

export function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatPublishDate(value: string) {
  const date = parsePublicationDate(value);
  if (!date) return "Immediately";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
}

export function formatPublicationTimezone() {
  return "UTC+0";
}
