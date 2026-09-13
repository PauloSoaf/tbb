import { prisma } from "@/lib/prisma";
import { CreateMealPlanInput, UpdateMealPlanInput, CreateMealInput, UpdateMealInput, CreateMealItemInput, UpdateMealItemInput } from "@/validation/meal-plan.schema";
import { MealItemSource, type Prisma } from "@prisma/client";
import {
  normalizeStudioMealDraftsFromRecords,
  replaceMealNodesInStudioDocument,
  type SerializableJson,
  type StudioMealDraft,
  type StudioMealItemDraft,
} from "@/lib/meal-plan/studio-content";
import { parseMealPlanPdfStyle, type MealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";

// --- Studio ---

export async function getMealPlanStudioData(nutritionistId: string, mealPlanId: string) {
  return prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
    include: {
      patient: { select: { id: true, name: true } },
      nutritionist: { select: { name: true, crn: true, profileImageUrl: true } },
      meals: {
        orderBy: { position: "asc" },
        include: {
          items: { orderBy: { position: "asc" } },
        },
      },
    },
  });
}

export interface SaveDraftInput {
  title?: string;
  objective?: string;
  description?: string;
  notes?: string;
  patientId?: string | null;
  isTemplate?: boolean;
  layoutMode?: string;
  coverImageUrl?: string | null;
  contentBlocks?: Record<string, SerializableJson>;
  pdfStyle?: MealPlanPdfStyle;
  meals?: StudioMealDraft[];
  templateCategory?: string;
  templateTags?: string[];
  startDate?: string;
  endDate?: string;
  targetCalories?: number;
}

function mealKey(meal: Pick<StudioMealDraft, "name" | "position">) {
  return `${meal.position}:${meal.name.trim().toLowerCase()}`;
}

function mealItemKey(item: Pick<StudioMealItemDraft, "foodName" | "position">) {
  return `${item.position}:${item.foodName.trim().toLowerCase()}`;
}

function normalizeMealItemSource(source: StudioMealItemDraft["source"]): MealItemSource {
  return source === "TACO" ? MealItemSource.TACO : MealItemSource.CUSTOM;
}

async function syncMealPlanMeals(
  tx: Prisma.TransactionClient,
  nutritionistId: string,
  mealPlanId: string,
  meals: StudioMealDraft[]
) {
  const existingMeals = await tx.meal.findMany({
    where: { mealPlanId, nutritionistId },
    include: { items: true },
  });

  const existingMealsById = new Map(existingMeals.map((meal) => [meal.id, meal]));
  const existingMealsByKey = new Map(existingMeals.map((meal) => [mealKey(meal), meal]));
  const existingItemsById = new Map(existingMeals.flatMap((meal) => meal.items.map((item) => [item.id, item] as const)));
  const keptMealIds: string[] = [];
  const keptItemIds: string[] = [];

  for (const meal of meals) {
    const existingMeal = meal.id ? existingMealsById.get(meal.id) : existingMealsByKey.get(mealKey(meal));
    const mealData = {
      name: meal.name.trim() || "Refeicao",
      time: meal.time ?? null,
      notes: meal.notes ?? null,
      imageUrl: meal.imageUrl ?? null,
      imageAlt: meal.imageAlt ?? null,
      imageCaption: meal.imageCaption ?? null,
      showImageInPdf: meal.showImageInPdf ?? true,
      position: meal.position,
    };

    const savedMeal = existingMeal
      ? await tx.meal.update({ where: { id: existingMeal.id }, data: mealData })
      : await tx.meal.create({
          data: {
            ...mealData,
            mealPlanId,
            nutritionistId,
          },
        });

    keptMealIds.push(savedMeal.id);

    const existingItems = existingMeal?.items ?? [];
    const existingItemsByKey = new Map(existingItems.map((item) => [mealItemKey(item), item]));

    for (const item of meal.items) {
      const existingItem = item.id ? existingItemsById.get(item.id) : existingItemsByKey.get(mealItemKey(item));
      const itemData = {
        foodName: item.foodName.trim(),
        source: normalizeMealItemSource(item.source),
        tacoFoodId: item.tacoFoodId ?? null,
        quantity: item.quantity,
        unit: item.unit,
        householdMeasure: item.householdMeasure ?? null,
        householdMeasureSource: item.householdMeasureSource ?? null,
        imageUrl: item.imageUrl ?? null,
        imageAlt: item.imageAlt ?? null,
        imageCaption: item.imageCaption ?? null,
        showImageInPdf: item.showImageInPdf ?? true,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber ?? null,
        sodium: item.sodium ?? null,
        notes: item.notes ?? null,
        position: item.position,
      };

      const savedItem = existingItem
        ? await tx.mealItem.update({ where: { id: existingItem.id }, data: { ...itemData, mealId: savedMeal.id } })
        : await tx.mealItem.create({
            data: {
              ...itemData,
              mealId: savedMeal.id,
              nutritionistId,
            },
          });

      keptItemIds.push(savedItem.id);
    }
  }

  await tx.mealItem.deleteMany({
    where: {
      nutritionistId,
      meal: { mealPlanId },
      id: keptItemIds.length > 0 ? { notIn: keptItemIds } : undefined,
    },
  });

  await tx.meal.deleteMany({
    where: {
      mealPlanId,
      nutritionistId,
      id: keptMealIds.length > 0 ? { notIn: keptMealIds } : undefined,
    },
  });
}

export async function saveMealPlanDraft(
  nutritionistId: string,
  mealPlanId: string,
  data: SaveDraftInput
) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano não encontrado.");

  return prisma.$transaction(async (tx) => {
    const updatedPlan = await tx.mealPlan.update({
      where: { id: mealPlanId },
      data: {
        title: data.title?.trim() || "Plano sem título",
        objective: data.objective ?? undefined,
        description: data.description ?? undefined,
        notes: data.notes ?? undefined,
        layoutMode: data.layoutMode ?? undefined,
        coverImageUrl: data.coverImageUrl,
        contentBlocks: data.contentBlocks ?? undefined,
        // Server actions are callable directly, so normalize the JSON here as
        // well as in the client panel. This keeps persisted PDF configuration
        // bounded to our supported fields/defaults.
        pdfStyle: data.pdfStyle
          ? (parseMealPlanPdfStyle(data.pdfStyle) as unknown as Prisma.InputJsonValue)
          : undefined,
        templateCategory: data.templateCategory ?? undefined,
        templateTags: data.templateTags ?? undefined,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        patientId: data.patientId ?? undefined,
        isTemplate: data.isTemplate ?? undefined,
        lastEditedAt: new Date(),
        targetCalories: data.targetCalories ?? undefined,
      },
    });

    if (data.meals !== undefined) {
      await syncMealPlanMeals(tx, nutritionistId, mealPlanId, data.meals);
    }

    return updatedPlan;
  });
}

export interface ReplaceMealPlanFromTemplateInput {
  title: string;
  objective?: string | null;
  description?: string | null;
  notes?: string | null;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  targetCalories?: number | null;
  contentBlocks?: unknown;
  meals: StudioMealDraft[];
}

export async function replaceMealPlanFromTemplate(
  nutritionistId: string,
  mealPlanId: string,
  source: ReplaceMealPlanFromTemplateInput
) {
  const target = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
    select: { id: true, patientId: true },
  });
  if (!target) throw new Error("Plano não encontrado.");

  return prisma.$transaction(async (tx) => {
    await tx.mealPlan.update({
      where: { id: mealPlanId },
      data: {
        title: source.title.trim() || "Plano sem título",
        objective: source.objective ?? null,
        description: source.description ?? null,
        notes: source.notes ?? null,
        totalCalories: source.totalCalories,
        totalCarbs: source.totalCarbs,
        totalProtein: source.totalProtein,
        totalFat: source.totalFat,
        targetCalories: source.targetCalories ?? null,
        lastEditedAt: new Date(),
        meals: {
          deleteMany: { nutritionistId },
          create: source.meals.map((meal) => ({
            nutritionistId,
            name: meal.name,
            time: meal.time ?? null,
            notes: meal.notes ?? null,
            imageUrl: meal.imageUrl ?? null,
            imageAlt: meal.imageAlt ?? null,
            imageCaption: meal.imageCaption ?? null,
            showImageInPdf: meal.showImageInPdf ?? true,
            position: meal.position,
            items: {
              create: meal.items.map((item) => ({
                nutritionistId,
                foodName: item.foodName,
                source: normalizeMealItemSource(item.source),
                tacoFoodId: item.tacoFoodId ?? null,
                quantity: item.quantity,
                unit: item.unit,
                householdMeasure: item.householdMeasure ?? null,
                householdMeasureSource: item.householdMeasureSource ?? null,
                imageUrl: item.imageUrl ?? null,
                imageAlt: item.imageAlt ?? null,
                imageCaption: item.imageCaption ?? null,
                showImageInPdf: item.showImageInPdf ?? true,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                fiber: item.fiber ?? null,
                sodium: item.sodium ?? null,
                notes: item.notes ?? null,
                position: item.position,
              })),
            },
          })),
        },
      },
    });

    const savedPlan = await tx.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        meals: {
          orderBy: { position: "asc" },
          include: { items: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!savedPlan) throw new Error("Plano não encontrado após a cópia.");

    const meals = normalizeStudioMealDraftsFromRecords(savedPlan.meals).map((meal) => {
      const sourceMeal = source.meals.find((candidate) => candidate.position === meal.position);
      return {
        ...meal,
        imageWidth: sourceMeal?.imageWidth,
        imageHeight: sourceMeal?.imageHeight,
        imageFit: sourceMeal?.imageFit,
        imageAlignment: sourceMeal?.imageAlignment,
        imageLayer: sourceMeal?.imageLayer,
        imageX: sourceMeal?.imageX,
        imageY: sourceMeal?.imageY,
        items: meal.items.map((item) => {
          const sourceItem = sourceMeal?.items.find((candidate) => candidate.position === item.position);
          return {
            ...item,
            imageWidth: sourceItem?.imageWidth,
            imageHeight: sourceItem?.imageHeight,
            imageFit: sourceItem?.imageFit,
            imageAlignment: sourceItem?.imageAlignment,
            imageLayer: sourceItem?.imageLayer,
            imageX: sourceItem?.imageX,
            imageY: sourceItem?.imageY,
            imagePlacement: sourceItem?.imagePlacement,
          };
        }),
      };
    });
    const contentBlocks = replaceMealNodesInStudioDocument(source.contentBlocks, meals);
    await tx.mealPlan.update({
      where: { id: mealPlanId },
      data: { contentBlocks: contentBlocks as Prisma.InputJsonValue },
    });

    return {
      patientId: target.patientId,
      plan: {
        title: savedPlan.title,
        objective: savedPlan.objective,
        description: savedPlan.description,
        notes: savedPlan.notes,
        totalCalories: savedPlan.totalCalories,
        totalCarbs: savedPlan.totalCarbs,
        totalProtein: savedPlan.totalProtein,
        totalFat: savedPlan.totalFat,
        targetCalories: savedPlan.targetCalories,
        meals,
        contentBlocks,
      },
    };
  });
}

export async function createBlankMealPlan(
  nutritionistId: string,
  opts: { isTemplate?: boolean; patientId?: string | null; title?: string }
) {
  return prisma.mealPlan.create({
    data: {
      nutritionistId,
      patientId: opts.patientId ?? null,
      isTemplate: opts.isTemplate ?? false,
      title: opts.title?.trim() || "Plano sem título",
      status: "DRAFT",
      lastEditedAt: new Date(),
    },
  });
}

// --- Meal Plans ---

export async function createMealPlan(nutritionistId: string, data: CreateMealPlanInput) {
  // For templates, patientId is optional
  if (!data.isTemplate && data.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, nutritionistId },
    });
    if (!patient) throw new Error("Paciente não encontrado ou não pertence a esta clínica.");
  }

  return prisma.mealPlan.create({
    data: {
      ...data,
      nutritionistId,
      patientId: data.patientId ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

export async function getMealPlansByPatient(nutritionistId: string, patientId: string) {
  return prisma.mealPlan.findMany({
    where: { nutritionistId, patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentMealPlanSummary(
  nutritionistId: string,
  patientId: string,
  limit = 4,
) {
  return prisma.mealPlan.findMany({
    where: { nutritionistId, patientId, isTemplate: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      totalCalories: true,
      startDate: true,
      createdAt: true,
    },
  });
}

export async function getMealPlanById(nutritionistId: string, mealPlanId: string) {
  return prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
    include: {
      patient: true,
      meals: {
        orderBy: { position: "asc" },
        include: {
          items: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
}

export async function updateMealPlan(nutritionistId: string, mealPlanId: string, data: UpdateMealPlanInput) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano alimentar não encontrado.");

  return prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
}

export async function activateMealPlan(nutritionistId: string, mealPlanId: string) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano alimentar não encontrado.");

  // Archive any currently active plans for the same patient
  await prisma.mealPlan.updateMany({
    where: {
      nutritionistId,
      patientId: plan.patientId,
      status: "ACTIVE",
      id: { not: mealPlanId },
    },
    data: { status: "ARCHIVED" },
  });

  return prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: { status: "ACTIVE" },
  });
}

export async function deleteMealPlan(nutritionistId: string, mealPlanId: string) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano alimentar não encontrado.");

  return prisma.mealPlan.delete({
    where: { id: mealPlanId },
  });
}

// --- Meals ---

export async function addMealToPlan(nutritionistId: string, data: CreateMealInput) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: data.mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano alimentar não encontrado.");

  return prisma.meal.create({
    data: {
      ...data,
      nutritionistId,
    },
  });
}

export async function updateMeal(nutritionistId: string, mealId: string, data: UpdateMealInput) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, nutritionistId },
  });
  if (!meal) throw new Error("Refeição não encontrada.");

  return prisma.meal.update({
    where: { id: mealId },
    data,
  });
}

export async function deleteMeal(nutritionistId: string, mealId: string) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, nutritionistId },
  });
  if (!meal) throw new Error("Refeição não encontrada.");

  return prisma.meal.delete({
    where: { id: mealId },
  });
}

// --- Meal Items ---

export async function addMealItem(nutritionistId: string, data: CreateMealItemInput) {
  const meal = await prisma.meal.findFirst({
    where: { id: data.mealId, nutritionistId },
  });
  if (!meal) throw new Error("Refeição não encontrada.");

  return prisma.mealItem.create({
    data: {
      ...data,
      nutritionistId,
    },
  });
}

export async function updateMealItem(nutritionistId: string, itemId: string, data: UpdateMealItemInput) {
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId, nutritionistId },
  });
  if (!item) throw new Error("Item não encontrado.");

  return prisma.mealItem.update({
    where: { id: itemId },
    data,
  });
}

export async function deleteMealItem(nutritionistId: string, itemId: string) {
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId, nutritionistId },
  });
  if (!item) throw new Error("Item não encontrado.");

  return prisma.mealItem.delete({
    where: { id: itemId },
  });
}

// --- Totals Update ---

export async function updateMealPlanTotals(nutritionistId: string, mealPlanId: string, totals: { calories: number; protein: number; carbs: number; fat: number }) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
  });
  if (!plan) throw new Error("Plano alimentar não encontrado.");

  return prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: {
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
    },
  });
}
