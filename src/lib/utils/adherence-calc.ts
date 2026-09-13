export type DayAdherenceInput = {
  loggedEntries: number;
  loggedCalories: number;
  adherencePct: number;
};

export function computeDayAdherencePct(loggedCalories: number, plannedCalories: number): number {
  if (plannedCalories <= 0) return 0;
  return Math.min(Math.round((loggedCalories / plannedCalories) * 100), 150);
}

export function computeAdherenceAggregates(
  dailyBreakdown: DayAdherenceInput[],
  totalDays: number,
  plannedCalories: number,
): { daysLogged: number; loggedAvgCalories: number; avgAdherencePct: number } {
  const daysLogged = dailyBreakdown.filter((d) => d.loggedEntries > 0).length;
  const loggedAvgCalories =
    daysLogged > 0
      ? Math.round(dailyBreakdown.reduce((s, d) => s + d.loggedCalories, 0) / daysLogged)
      : 0;
  const avgAdherencePct =
    plannedCalories > 0 && daysLogged > 0
      ? Math.round(dailyBreakdown.reduce((s, d) => s + d.adherencePct, 0) / totalDays)
      : 0;

  return { daysLogged, loggedAvgCalories, avgAdherencePct };
}
