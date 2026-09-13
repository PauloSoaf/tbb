/** Calendar dates are ISO strings; timestamps are UTC and projected in the workspace zone. */
export function dayKey(date = new Date(), timeZone = "America/Manaus"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateKeyToUTC(value: string): Date {
  if (!isDateKey(value)) throw new Error("Data inválida. Use AAAA-MM-DD.");
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(value: string, count: number): string {
  const date = dateKeyToUTC(value);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function weekday(value: string): number { return dateKeyToUTC(value).getUTCDay(); }
export function startOfWeek(value: string): string { return addDays(value, -((weekday(value) + 6) % 7)); }
export function startOfMonth(value: string): string { return `${value.slice(0, 7)}-01`; }
export function endOfMonth(value: string): string {
  const date = dateKeyToUTC(startOfMonth(value));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(start: string, end: string): string[] {
  if (start > end) return [];
  const count = Math.round((dateKeyToUTC(end).getTime() - dateKeyToUTC(start).getTime()) / 86_400_000) + 1;
  if (count > 40_000) throw new Error("Intervalo de datas muito grande.");
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
export function yearDays(year: number): string[] { return daysBetween(`${year}-01-01`, `${year}-12-31`); }
export function formatDay(value: string, locale = "pt-BR", options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(dateKeyToUTC(value));
}

/** Reject nonexistent wall times (DST gaps); choose the first matching instant on overlaps. */
export function zonedDateTimeToUtc(value: string, timeZone: string): Date {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match || !isDateKey(match[1])) throw new Error("Data e horário inválidos.");
  const nominal = dateKeyToUTC(match[1]).getTime() + (Number(match[2]) * 60 + Number(match[3])) * 60_000;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function wallTime(timestamp: number) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const get = (type: string) => parts.find((part) => part.type === type)!.value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  }
  // World civil offsets lie within -12h..+14h. Minute resolution also covers half-hour zones.
  for (let offset = 14 * 60; offset >= -12 * 60; offset--) {
    const candidate = nominal - offset * 60_000;
    if (wallTime(candidate) === value) return new Date(candidate);
  }
  throw new Error("Este horário não existe no fuso do workspace. Escolha outro horário.");
}

export function localDateTimeValue(value: Date | null, timeZone: string): string {
  if (!value) return "";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value);
  return `${dayKey(value, timeZone)}T${time}`;
}
