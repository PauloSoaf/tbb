import { isDateKey } from "@/lib/dates";

/** Resolve a local purchase time without inventing midnight. DST overlaps/gaps require
 * explicit review instead of picking one of two possible instants silently. */
export function localPurchaseInstant(day: string, time: string, timezone: string): string {
  if (!isDateKey(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Data/hora da compra inválida.");
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const matches: number[] = [], local = Date.parse(`${day}T${time}:00Z`);
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const utc = local - offset * 60000, parts = Object.fromEntries(formatter.formatToParts(new Date(utc)).map(p => [p.type, p.value]));
    if (`${parts.year}-${parts.month}-${parts.day}` === day && `${parts.hour}:${parts.minute}` === time) matches.push(utc);
  }
  if (matches.length !== 1) throw new Error("Horário ambíguo/inexistente no timezone; confirme a hora original.");
  return new Date(matches[0]).toISOString();
}
