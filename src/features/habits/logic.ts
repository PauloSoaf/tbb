import { addDays, daysBetween, endOfMonth, startOfMonth, startOfWeek, weekday } from "@/lib/dates";

export type HabitDefinition = {
  target: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  startDate: string;
  endDate?: string | null;
  schedule?: { days: number[]; monthlyDay?: number | null } | null;
};
export type HabitValue = { date: string; value: number; note?: string | null };

export function isHabitDay(habit: HabitDefinition, date: string): boolean {
  return date >= habit.startDate && (!habit.endDate || date <= habit.endDate) && (!habit.schedule || habit.schedule.days.includes(weekday(date)));
}

export function habitPeriod(habit: HabitDefinition, date: string) {
  if (habit.frequency === "WEEKLY") return { start: startOfWeek(date), end: addDays(startOfWeek(date), 6) };
  if (habit.frequency === "MONTHLY") return { start: startOfMonth(date), end: endOfMonth(date) };
  return { start: date, end: date };
}

export function habitProgress(habit: HabitDefinition, entries: HabitValue[], date: string) {
  const { start, end } = habitPeriod(habit, date);
  const value = entries.filter((entry) => entry.date >= start && entry.date <= end && isHabitDay(habit, entry.date)).reduce((sum, entry) => sum + entry.value, 0);
  return { value, target: habit.target, completed: value >= habit.target, percent: Math.min(100, Math.round(value / habit.target * 100)) };
}

/** Streaks count scheduled days for daily habits, calendar weeks/months for period goals. */
export function habitStats(habit: HabitDefinition, entries: HabitValue[], through: string, from = habit.startDate) {
  const start = from > habit.startDate ? from : habit.startDate;
  const end = habit.endDate && habit.endDate < through ? habit.endDate : through;
  const dates = daysBetween(start, end).filter((date) => isHabitDay(habit, date));
  const periods = [...new Map(dates.map((date) => [habitPeriod(habit, date).start, date])).values()];
  const progress = periods.map((date) => ({ ...habitProgress(habit, entries, date), ...habitPeriod(habit, date), date }));
  // An open, incomplete current period must not lower historical completion rate.
  const assessed = progress.filter((period) => period.completed || period.end < through);
  let longestStreak = 0;
  let streak = 0;
  for (const period of progress) {
    streak = period.completed ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  let currentStreak = 0;
  let index = progress.length - 1;
  if (index >= 0 && !progress[index].completed && progress[index].end >= through) index--;
  while (index >= 0 && progress[index].completed) { currentStreak++; index--; }
  const values = entries.filter((entry) => entry.date >= start && entry.date <= end && isHabitDay(habit, entry.date));
  const total = values.reduce((sum, entry) => sum + entry.value, 0);
  const weekdays = Array.from({ length: 7 }, (_, day) => {
    const scheduled = dates.filter((date) => weekday(date) === day);
    const recorded = new Map(values.map((entry) => [entry.date, entry.value]));
    const completed = scheduled.filter((date) => (recorded.get(date) ?? 0) >= (habit.frequency === "DAILY" ? habit.target : 1)).length;
    return { day, count: scheduled.length, rate: scheduled.length ? completed / scheduled.length : 0 };
  }).filter((item) => item.count > 0);
  const ranked = [...weekdays].sort((a, b) => b.rate - a.rate);
  const consistency = (rangeStart: string, rangeEnd: string) => {
    const range = dates.filter((date) => date >= rangeStart && date <= rangeEnd);
    if (!range.length) return 0;
    const done = range.filter((date) => habit.frequency === "DAILY" ? habitProgress(habit, entries, date).completed : values.some((entry) => entry.date === date && entry.value > 0)).length;
    return Math.round(done / range.length * 100);
  };
  return {
    currentStreak, longestStreak,
    completionRate: assessed.length ? Math.round(assessed.filter((period) => period.completed).length / assessed.length * 100) : 0,
    completedPeriods: assessed.filter((period) => period.completed).length,
    totalPeriods: assessed.length, total,
    average: dates.length ? total / dates.length : 0,
    bestWeekday: ranked[0]?.day ?? null,
    worstWeekday: ranked.at(-1)?.day ?? null,
    weeklyConsistency: consistency(startOfWeek(through), through),
    monthlyConsistency: consistency(startOfMonth(through), through),
  };
}
