import { MealItemSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  MealPlanLibraryData,
  SavedMealPlanLibraryFood,
  SavedMealPlanLibraryMeal,
} from "@/lib/meal-plan/library-types";
import type {
  SaveMealPlanLibraryFoodInput,
  SaveMealPlanLibraryMealInput,
} from "@/validation/meal-plan-library.schema";

const MEAL_PRESENTATION_KEYS = [
  "imageUrl",
  "imageAlt",
  "imageCaption",
  "showImageInPdf",
  "imageWidth",
  "imageHeight",
  "imageFit",
  "imageAlignment",
  "imageLayer",
  "imageX",
  "imageY",
] as const;

const FOOD_PRESENTATION_KEYS = [...MEAL_PRESENTATION_KEYS, "imagePlacement"] as const;

type SavedMealRow = Prisma.MealPlanLibraryMealGetPayload<{ include: { items: true } }>;
type SavedFoodRow = Prisma.MealPlanLibraryFoodGetPayload<Record<string, never>>;
type SavedMealItemRow = SavedMealRow["items"][number];

type MealPlanLibraryPrisma = {
  mealPlanLibraryMeal?: typeof prisma.mealPlanLibraryMeal;
  mealPlanLibraryFood?: typeof prisma.mealPlanLibraryFood;
};

const EMPTY_LIBRARY: MealPlanLibraryData = { meals: [], foods: [] };

/**
 * PrismaClient is cached on globalThis in development. After `prisma generate`,
 * Next.js can hot-reload this module while that cached client still exposes the
 * old delegates. An unavailable library must not prevent a meal plan from opening.
 */
function getLibraryPrisma() {
  const client = prisma as unknown as MealPlanLibraryPrisma;
  if (!client.mealPlanLibraryMeal || !client.mealPlanLibraryFood) return null;
  return {
    mealPlanLibraryMeal: client.mealPlanLibraryMeal,
    mealPlanLibraryFood: client.mealPlanLibraryFood,
  };
}

function requireLibraryPrisma() {
  const client = getLibraryPrisma();
  if (!client) {
    throw new Error(
      "A biblioteca precisa do Prisma Client atualizado. Pare o servidor, execute `npx prisma generate` e inicie `npm run dev` novamente.",
    );
  }
  return client;
}

function isLibraryTableMissing(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function withLibraryTables<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isLibraryTableMissing(error)) {
      throw new Error(
        "A biblioteca ainda não foi ativada no banco. Execute `npm run prisma:deploy` e reinicie a aplicação.",
      );
    }
    throw error;
  }
}

function toMealItemSource(source: "TACO" | "CUSTOM") {
  return source === "TACO" ? MealItemSource.TACO : MealItemSource.CUSTOM;
}

function pickPresentation(
  input: Record<string, unknown>,
  keys: readonly string[],
): Prisma.InputJsonObject | undefined {
  const entries = keys
    .map((key) => [key, input[key]] as const)
    .filter((entry): entry is readonly [string, Prisma.InputJsonValue] => entry[1] !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readPresentation(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mapSavedFood(row: SavedFoodRow): SavedMealPlanLibraryFood {
  return {
    ...readPresentation(row.presentation),
    id: row.id,
    foodName: row.name,
    source: row.source === MealItemSource.TACO ? "TACO" : "CUSTOM",
    tacoFoodId: row.tacoFoodId,
    quantity: row.defaultQuantity,
    unit: row.unit,
    householdMeasure: row.householdMeasure,
    householdMeasureSource: row.householdMeasureSource,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sodium: row.sodium,
    notes: row.notes,
    timesUsed: row.timesUsed,
    updatedAt: row.updatedAt.toISOString(),
  } as SavedMealPlanLibraryFood;
}

function mapSavedMealItem(row: SavedMealItemRow) {
  return {
    ...readPresentation(row.presentation),
    foodName: row.name,
    source: row.source === MealItemSource.TACO ? "TACO" as const : "CUSTOM" as const,
    tacoFoodId: row.tacoFoodId,
    quantity: row.quantity,
    unit: row.unit,
    householdMeasure: row.householdMeasure,
    householdMeasureSource: row.householdMeasureSource,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sodium: row.sodium,
    notes: row.notes,
    position: row.position,
  };
}

function mapSavedMeal(row: SavedMealRow): SavedMealPlanLibraryMeal {
  return {
    ...readPresentation(row.presentation),
    id: row.id,
    name: row.name,
    time: row.defaultTime,
    notes: row.notes,
    items: row.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(mapSavedMealItem),
    timesUsed: row.timesUsed,
    updatedAt: row.updatedAt.toISOString(),
  } as SavedMealPlanLibraryMeal;
}

export async function getMealPlanLibraryData(nutritionistId: string): Promise<MealPlanLibraryData> {
  const client = getLibraryPrisma();
  if (!client) return EMPTY_LIBRARY;

  try {
    const [meals, foods] = await Promise.all([
      client.mealPlanLibraryMeal.findMany({
        where: { nutritionistId },
        include: { items: { orderBy: { position: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      client.mealPlanLibraryFood.findMany({
        where: { nutritionistId },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

    return {
      meals: meals.map(mapSavedMeal),
      foods: foods.map(mapSavedFood),
    };
  } catch (error) {
    if (isLibraryTableMissing(error)) return EMPTY_LIBRARY;
    throw error;
  }
}

export async function saveMealPlanLibraryFood(
  nutritionistId: string,
  input: SaveMealPlanLibraryFoodInput,
) {
  const client = requireLibraryPrisma();
  const saved = await withLibraryTables(() => client.mealPlanLibraryFood.create({
    data: {
      nutritionistId,
      name: input.foodName,
      source: toMealItemSource(input.source),
      tacoFoodId: input.tacoFoodId || null,
      defaultQuantity: input.quantity,
      unit: input.unit,
      householdMeasure: input.householdMeasure || null,
      householdMeasureSource: input.householdMeasureSource || null,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      fiber: input.fiber ?? null,
      sodium: input.sodium ?? null,
      notes: input.notes || null,
      presentation: pickPresentation(input as Record<string, unknown>, FOOD_PRESENTATION_KEYS),
    },
  }));
  return mapSavedFood(saved);
}

export async function saveMealPlanLibraryMeal(
  nutritionistId: string,
  input: SaveMealPlanLibraryMealInput,
) {
  const client = requireLibraryPrisma();
  const saved = await withLibraryTables(() => client.mealPlanLibraryMeal.create({
    data: {
      nutritionistId,
      name: input.name,
      defaultTime: input.time || null,
      notes: input.notes || null,
      presentation: pickPresentation(input as Record<string, unknown>, MEAL_PRESENTATION_KEYS),
      items: {
        create: input.items.map((item, index) => ({
          name: item.foodName,
          source: toMealItemSource(item.source),
          tacoFoodId: item.tacoFoodId || null,
          quantity: item.quantity,
          unit: item.unit,
          householdMeasure: item.householdMeasure || null,
          householdMeasureSource: item.householdMeasureSource || null,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber ?? null,
          sodium: item.sodium ?? null,
          notes: item.notes || null,
          position: item.position ?? index,
          presentation: pickPresentation(item as Record<string, unknown>, FOOD_PRESENTATION_KEYS),
        })),
      },
    },
    include: { items: { orderBy: { position: "asc" } } },
  }));
  return mapSavedMeal(saved);
}

export async function deleteMealPlanLibraryFood(nutritionistId: string, id: string) {
  const client = requireLibraryPrisma();
  const result = await withLibraryTables(() => client.mealPlanLibraryFood.deleteMany({ where: { id, nutritionistId } }));
  if (result.count === 0) throw new Error("Alimento salvo não encontrado.");
}

export async function deleteMealPlanLibraryMeal(nutritionistId: string, id: string) {
  const client = requireLibraryPrisma();
  const result = await withLibraryTables(() => client.mealPlanLibraryMeal.deleteMany({ where: { id, nutritionistId } }));
  if (result.count === 0) throw new Error("Refeição salva não encontrada.");
}

export async function registerMealPlanLibraryUse(
  nutritionistId: string,
  input: { type: "MEAL" | "FOOD"; id: string },
) {
  const client = requireLibraryPrisma();
  if (input.type === "MEAL") {
    await withLibraryTables(() => client.mealPlanLibraryMeal.updateMany({
      where: { id: input.id, nutritionistId },
      data: { timesUsed: { increment: 1 } },
    }));
    return;
  }
  await withLibraryTables(() => client.mealPlanLibraryFood.updateMany({
    where: { id: input.id, nutritionistId },
    data: { timesUsed: { increment: 1 } },
  }));
}
