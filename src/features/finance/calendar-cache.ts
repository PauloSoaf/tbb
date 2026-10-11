import type { FinanceCalendarMonth } from "./calendar-core";

type CachedMonth = { snapshot: FinanceCalendarMonth; data: FinanceCalendarMonth };
export type CalendarCache = Record<string, CachedMonth>;

/** A fresh RSC snapshot invalidates all previously loaded months, including deletions. */
export function cachedCalendarMonth(cache: CalendarCache, month: string, snapshot: FinanceCalendarMonth) {
  return cache[month]?.snapshot === snapshot ? cache[month].data : undefined;
}

export function cacheCalendarMonth(cache: CalendarCache, data: FinanceCalendarMonth, snapshot: FinanceCalendarMonth): CalendarCache {
  const next = Object.fromEntries(Object.entries(cache).filter(([key, entry]) => key !== data.month && entry.snapshot === snapshot));
  next[data.month] = { data, snapshot };
  const keys = Object.keys(next);
  if (keys.length > 12) delete next[keys[0]];
  return next;
}
