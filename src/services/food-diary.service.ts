import { prisma } from "@/lib/prisma";
import type { FoodDiaryMeal } from "@prisma/client";

export interface DiaryEntryInput {
  meal: FoodDiaryMeal;
  foodName: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  hunger?: number;
  satiety?: number;
  mood?: string;
  notes?: string;
  loggedAt?: Date;
}

export async function getFoodDiaryEntries(
  patientId: string,
  nutritionistId: string,
  from?: Date,
  to?: Date
) {
  return prisma.foodDiaryEntry.findMany({
    where: {
      patientId,
      nutritionistId,
      loggedAt: { gte: from, lte: to },
    },
    orderBy: { loggedAt: "desc" },
  });
}

export async function createFoodDiaryEntry(
  patientId: string,
  nutritionistId: string,
  data: DiaryEntryInput
) {
  return prisma.foodDiaryEntry.create({
    data: {
      patientId,
      nutritionistId,
      meal: data.meal,
      foodName: data.foodName,
      quantity: data.quantity,
      unit: data.unit,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      hunger: data.hunger,
      satiety: data.satiety,
      mood: data.mood,
      notes: data.notes,
      loggedAt: data.loggedAt ?? new Date(),
    },
  });
}

export async function deleteFoodDiaryEntry(
  patientId: string,
  nutritionistId: string,
  entryId: string
) {
  const e = await prisma.foodDiaryEntry.findFirst({ where: { id: entryId, patientId, nutritionistId } });
  if (!e) throw new Error("Entrada não encontrada.");
  return prisma.foodDiaryEntry.delete({ where: { id: entryId } });
}

export async function getDiaryStats(
  patientId: string,
  nutritionistId: string,
  from: Date,
  to: Date
) {
  const entries = await prisma.foodDiaryEntry.findMany({
    where: { patientId, nutritionistId, loggedAt: { gte: from, lte: to } },
  });

  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
  for (const e of entries) {
    totalCalories += e.calories ?? 0;
    totalProtein += e.protein ?? 0;
    totalCarbs += e.carbs ?? 0;
    totalFat += e.fat ?? 0;
  }

  return {
    totalEntries: entries.length,
    avgCaloriesPerDay: Math.round(totalCalories / days),
    avgProteinPerDay: Number((totalProtein / days).toFixed(1)),
    avgCarbsPerDay: Number((totalCarbs / days).toFixed(1)),
    avgFatPerDay: Number((totalFat / days).toFixed(1)),
  };
}
