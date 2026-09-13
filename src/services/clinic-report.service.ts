import { prisma } from "@/lib/prisma";
import { subDays, startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getClinicOverview(nutritionistId: string) {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    totalPatients,
    activePatients,
    appointmentsThisMonth,
    newPatientsThisMonth,
    goalsStats,
    diaryStats,
    avgWeight,
    activeMealPlans,
  ] = await Promise.all([
    prisma.patient.count({ where: { nutritionistId } }),
    prisma.patient.count({ where: { nutritionistId, status: "ACTIVE" } }),
    prisma.appointment.count({
      where: { nutritionistId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.patient.count({
      where: { nutritionistId, createdAt: { gte: monthStart } },
    }),
    prisma.patientGoal.groupBy({
      by: ["status"],
      where: { nutritionistId },
      _count: true,
    }),
    prisma.foodDiaryEntry.count({
      where: { nutritionistId, loggedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.patientMeasurement.aggregate({
      where: { nutritionistId, weight: { not: null }, measuredAt: { gte: thirtyDaysAgo } },
      _avg: { weight: true, bmi: true, bodyFatPercentage: true },
    }),
    prisma.mealPlan.count({
      where: { nutritionistId, status: "ACTIVE", isTemplate: false },
    }),
  ]);

  const goalsMap = Object.fromEntries(goalsStats.map((g) => [g.status, g._count]));

  return {
    totalPatients,
    activePatients,
    appointmentsThisMonth,
    newPatientsThisMonth,
    activeMealPlans,
    goals: {
      active: goalsMap["ACTIVE"] ?? 0,
      achieved: goalsMap["ACHIEVED"] ?? 0,
      abandoned: goalsMap["ABANDONED"] ?? 0,
    },
    diaryEntriesLast30Days: diaryStats,
    avgMeasurements: {
      weight: avgWeight._avg.weight ? Number(avgWeight._avg.weight.toFixed(1)) : null,
      bmi: avgWeight._avg.bmi ? Number(avgWeight._avg.bmi.toFixed(1)) : null,
      bodyFatPercentage: avgWeight._avg.bodyFatPercentage ? Number(avgWeight._avg.bodyFatPercentage.toFixed(1)) : null,
    },
  };
}

export async function getPatientEngagementList(nutritionistId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const [patients, diaryCounts, goalCounts, checkinCounts] = await Promise.all([
    prisma.patient.findMany({
      where: { nutritionistId, status: "ACTIVE" },
      select: { id: true, name: true, goal: true, createdAt: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.foodDiaryEntry.groupBy({
      by: ["patientId"],
      where: { nutritionistId, loggedAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
    prisma.patientGoal.groupBy({
      by: ["patientId"],
      where: { nutritionistId, status: "ACTIVE" },
      _count: true,
    }),
    prisma.wellnessCheckin.groupBy({
      by: ["patientId"],
      where: { nutritionistId, date: { gte: sevenDaysAgo } },
      _count: true,
    }),
  ]);

  const diaryMap = Object.fromEntries(diaryCounts.map((d) => [d.patientId, d._count]));
  const goalMap = Object.fromEntries(goalCounts.map((g) => [g.patientId, g._count]));
  const checkinMap = Object.fromEntries(checkinCounts.map((c) => [c.patientId, c._count]));

  return patients.map((p) => ({
    id: p.id,
    name: p.name,
    goal: p.goal,
    createdAt: p.createdAt,
    diaryEntriesLast30Days: diaryMap[p.id] ?? 0,
    activeGoals: goalMap[p.id] ?? 0,
    checkinLast7Days: checkinMap[p.id] ?? 0,
  }));
}

export async function getMonthlyAppointments(nutritionistId: string, months = 6) {
  const result: { month: string; total: number; done: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const [total, done] = await Promise.all([
      prisma.appointment.count({ where: { nutritionistId, date: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { nutritionistId, status: "DONE", date: { gte: start, lte: end } } }),
    ]);
    result.push({ month: format(d, "MMM", { locale: ptBR }), total, done });
  }

  return result;
}
