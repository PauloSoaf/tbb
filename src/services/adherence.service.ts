import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";
import { computeDayAdherencePct, computeAdherenceAggregates } from "@/lib/utils/adherence-calc";

export interface DayAdherence {
  date: string;
  plannedCalories: number;
  loggedCalories: number;
  loggedEntries: number;
  adherencePct: number;
}

export interface AdherenceReport {
  from: Date;
  to: Date;
  avgAdherencePct: number;
  daysLogged: number;
  totalDays: number;
  dailyBreakdown: DayAdherence[];
  plannedAvgCalories: number;
  loggedAvgCalories: number;
}

export async function getAdherenceReport(
  patientId: string,
  nutritionistId: string,
  from: Date,
  to: Date
): Promise<AdherenceReport> {
  const [activePlan, diaryEntries] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { patientId, nutritionistId, status: "ACTIVE" },
      include: { meals: { include: { items: true } } },
    }),
    prisma.foodDiaryEntry.findMany({
      where: {
        patientId,
        nutritionistId,
        loggedAt: { gte: from, lte: to },
      },
    }),
  ]);

  const plannedCalories = activePlan
    ? activePlan.meals.reduce((sum, meal) => sum + meal.items.reduce((s, i) => s + (i.calories ?? 0), 0), 0)
    : 0;

  const days = eachDayOfInterval({ start: from, end: to });
  const totalDays = days.length;

  const dailyBreakdown: DayAdherence[] = days.map((day) => {
    const dayEntries = diaryEntries.filter((e) => {
      const d = new Date(e.loggedAt);
      return d >= startOfDay(day) && d <= endOfDay(day);
    });
    const logged = dayEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0);
    const adherencePct = computeDayAdherencePct(logged, plannedCalories);
    return {
      date: format(day, "yyyy-MM-dd"),
      plannedCalories: Math.round(plannedCalories),
      loggedCalories: Math.round(logged),
      loggedEntries: dayEntries.length,
      adherencePct,
    };
  });

  const { daysLogged, loggedAvgCalories, avgAdherencePct } = computeAdherenceAggregates(
    dailyBreakdown,
    totalDays,
    plannedCalories,
  );

  return {
    from,
    to,
    avgAdherencePct,
    daysLogged,
    totalDays,
    dailyBreakdown,
    plannedAvgCalories: Math.round(plannedCalories),
    loggedAvgCalories,
  };
}
