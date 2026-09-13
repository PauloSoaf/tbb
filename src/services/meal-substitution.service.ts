import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  calculateEquivalentByCalories,
  calculateEquivalentByCarbs,
  calculateEquivalentByFat,
  calculateEquivalentByProtein,
  calculateNutritionByQuantity,
  type FoodPer100g,
  type NutritionBasis,
} from "@/lib/utils/food-equivalents";
import type {
  CreateSubstitutionGroupInput,
  CreateSubstitutionItemInput,
  ReorderSubstitutionItemsInput,
  SuggestEquivalentPortionInput,
  UpdateSubstitutionGroupInput,
  UpdateSubstitutionItemInput,
} from "@/validation/meal-substitution.schema";

export type MealSubstitutionItemDTO = {
  id: string;
  nutritionistId: string;
  groupId: string;
  foodName: string;
  source: "TACO" | "CUSTOM";
  tacoFoodId: string | null;
  quantity: number | null;
  unit: string | null;
  householdMeasure: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  equivalenceNotes: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MealSubstitutionGroupDTO = {
  id: string;
  nutritionistId: string;
  mealPlanId: string;
  mealId: string | null;
  baseMealItemId: string | null;
  type: "ITEM_REPLACEMENT" | "MEAL_OPTION";
  title: string;
  description: string | null;
  equivalenceBasis: "CALORIES" | "MACROS" | "CARBS" | "PROTEIN" | "FAT" | "PORTION" | "FOOD_GROUP" | "MANUAL";
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  targetQuantity: number | null;
  targetUnit: string | null;
  visibleToPatient: boolean;
  notes: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  items: MealSubstitutionItemDTO[];
};

type QueryClient = Prisma.TransactionClient | typeof prisma;

async function assertMealPlanAccess(nutritionistId: string, mealPlanId: string) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, nutritionistId },
    select: { id: true },
  });
  if (!plan) throw new Error("Plano alimentar nao encontrado.");
}

async function assertMealAndItemAccess(nutritionistId: string, input: Pick<CreateSubstitutionGroupInput, "mealPlanId" | "mealId" | "baseMealItemId">) {
  if (input.mealId) {
    const meal = await prisma.meal.findFirst({
      where: { id: input.mealId, mealPlanId: input.mealPlanId, nutritionistId },
      select: { id: true },
    });
    if (!meal) throw new Error("Refeicao nao encontrada.");
  }

  if (input.baseMealItemId) {
    const item = await prisma.mealItem.findFirst({
      where: {
        id: input.baseMealItemId,
        nutritionistId,
        meal: { mealPlanId: input.mealPlanId },
      },
      select: { id: true },
    });
    if (!item) throw new Error("Alimento base nao encontrado.");
  }
}

function mergeGroupsWithItems(groups: Omit<MealSubstitutionGroupDTO, "items">[], items: MealSubstitutionItemDTO[]): MealSubstitutionGroupDTO[] {
  const byGroup = new Map<string, MealSubstitutionItemDTO[]>();
  for (const item of items) {
    const current = byGroup.get(item.groupId) ?? [];
    current.push(item);
    byGroup.set(item.groupId, current);
  }
  return groups.map((group) => ({ ...group, items: byGroup.get(group.id) ?? [] }));
}

async function fetchGroups(whereSql: Prisma.Sql, client: QueryClient = prisma): Promise<MealSubstitutionGroupDTO[]> {
  const groups = await client.$queryRaw<Omit<MealSubstitutionGroupDTO, "items">[]>`
    SELECT * FROM "meal_substitution_groups"
    WHERE ${whereSql}
    ORDER BY "position" ASC, "createdAt" ASC
  `;
  if (groups.length === 0) return [];
  const ids = groups.map((group) => group.id);
  const items = await client.$queryRaw<MealSubstitutionItemDTO[]>`
    SELECT * FROM "meal_substitution_items"
    WHERE "groupId" IN (${Prisma.join(ids)})
    ORDER BY "position" ASC, "createdAt" ASC
  `;
  return mergeGroupsWithItems(groups, items);
}

export async function createSubstitutionGroup(nutritionistId: string, data: CreateSubstitutionGroupInput) {
  await assertMealPlanAccess(nutritionistId, data.mealPlanId);
  await assertMealAndItemAccess(nutritionistId, data);

  const id = randomUUID();
  const now = new Date();
  const [group] = await prisma.$queryRaw<Omit<MealSubstitutionGroupDTO, "items">[]>`
    INSERT INTO "meal_substitution_groups" (
      "id", "nutritionistId", "mealPlanId", "mealId", "baseMealItemId", "type",
      "title", "description", "equivalenceBasis", "targetCalories", "targetProtein",
      "targetCarbs", "targetFat", "targetQuantity", "targetUnit", "visibleToPatient",
      "notes", "position", "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${nutritionistId}, ${data.mealPlanId}, ${data.mealId ?? null}, ${data.baseMealItemId ?? null},
      CAST(${data.type} AS "SubstitutionGroupType"), ${data.title}, ${data.description ?? null},
      CAST(${data.equivalenceBasis} AS "EquivalenceBasis"), ${data.targetCalories ?? null},
      ${data.targetProtein ?? null}, ${data.targetCarbs ?? null}, ${data.targetFat ?? null},
      ${data.targetQuantity ?? null}, ${data.targetUnit ?? null}, ${data.visibleToPatient},
      ${data.notes ?? null}, ${data.position}, ${now}, ${now}
    )
    RETURNING *
  `;
  return { ...group, items: [] };
}

export async function updateSubstitutionGroup(nutritionistId: string, data: UpdateSubstitutionGroupInput) {
  const existing = await getSubstitutionGroupById({ nutritionistId, groupId: data.id });
  if (!existing) throw new Error("Grupo de substituicao nao encontrado.");

  const updated = {
    mealPlanId: data.mealPlanId ?? existing.mealPlanId,
    mealId: data.mealId === undefined ? existing.mealId : data.mealId,
    baseMealItemId: data.baseMealItemId === undefined ? existing.baseMealItemId : data.baseMealItemId,
    type: data.type ?? existing.type,
    title: data.title ?? existing.title,
    description: data.description === undefined ? existing.description : data.description,
    equivalenceBasis: data.equivalenceBasis ?? existing.equivalenceBasis,
    targetCalories: data.targetCalories === undefined ? existing.targetCalories : data.targetCalories,
    targetProtein: data.targetProtein === undefined ? existing.targetProtein : data.targetProtein,
    targetCarbs: data.targetCarbs === undefined ? existing.targetCarbs : data.targetCarbs,
    targetFat: data.targetFat === undefined ? existing.targetFat : data.targetFat,
    targetQuantity: data.targetQuantity === undefined ? existing.targetQuantity : data.targetQuantity,
    targetUnit: data.targetUnit === undefined ? existing.targetUnit : data.targetUnit,
    visibleToPatient: data.visibleToPatient ?? existing.visibleToPatient,
    notes: data.notes === undefined ? existing.notes : data.notes,
    position: data.position ?? existing.position,
  };

  await assertMealPlanAccess(nutritionistId, updated.mealPlanId);
  await assertMealAndItemAccess(nutritionistId, updated);

  const [group] = await prisma.$queryRaw<Omit<MealSubstitutionGroupDTO, "items">[]>`
    UPDATE "meal_substitution_groups"
    SET "mealPlanId" = ${updated.mealPlanId}, "mealId" = ${updated.mealId}, "baseMealItemId" = ${updated.baseMealItemId},
      "type" = CAST(${updated.type} AS "SubstitutionGroupType"), "title" = ${updated.title},
      "description" = ${updated.description}, "equivalenceBasis" = CAST(${updated.equivalenceBasis} AS "EquivalenceBasis"),
      "targetCalories" = ${updated.targetCalories}, "targetProtein" = ${updated.targetProtein},
      "targetCarbs" = ${updated.targetCarbs}, "targetFat" = ${updated.targetFat},
      "targetQuantity" = ${updated.targetQuantity}, "targetUnit" = ${updated.targetUnit},
      "visibleToPatient" = ${updated.visibleToPatient}, "notes" = ${updated.notes},
      "position" = ${updated.position}, "updatedAt" = ${new Date()}
    WHERE "id" = ${data.id} AND "nutritionistId" = ${nutritionistId}
    RETURNING *
  `;
  return { ...group, items: existing.items };
}

export async function deleteSubstitutionGroup(input: { nutritionistId: string; groupId: string }) {
  const result = await prisma.$executeRaw`
    DELETE FROM "meal_substitution_groups"
    WHERE "id" = ${input.groupId} AND "nutritionistId" = ${input.nutritionistId}
  `;
  if (result === 0) throw new Error("Grupo de substituicao nao encontrado.");
}

export async function getSubstitutionGroupsByMealPlan(input: { nutritionistId: string; mealPlanId: string; visibleOnly?: boolean }) {
  const visibleFilter = input.visibleOnly ? Prisma.sql`AND "visibleToPatient" = true` : Prisma.empty;
  return fetchGroups(Prisma.sql`"nutritionistId" = ${input.nutritionistId} AND "mealPlanId" = ${input.mealPlanId} ${visibleFilter}`);
}

export async function getSubstitutionGroupsByMeal(input: { nutritionistId: string; mealId: string; visibleOnly?: boolean }) {
  const visibleFilter = input.visibleOnly ? Prisma.sql`AND "visibleToPatient" = true` : Prisma.empty;
  return fetchGroups(Prisma.sql`"nutritionistId" = ${input.nutritionistId} AND "mealId" = ${input.mealId} ${visibleFilter}`);
}

export async function getSubstitutionGroupsByMealItem(input: { nutritionistId: string; mealItemId: string; visibleOnly?: boolean }) {
  const visibleFilter = input.visibleOnly ? Prisma.sql`AND "visibleToPatient" = true` : Prisma.empty;
  return fetchGroups(Prisma.sql`"nutritionistId" = ${input.nutritionistId} AND "baseMealItemId" = ${input.mealItemId} ${visibleFilter}`);
}

export async function getSubstitutionGroupById(input: { nutritionistId: string; groupId: string }) {
  const groups = await fetchGroups(Prisma.sql`"nutritionistId" = ${input.nutritionistId} AND "id" = ${input.groupId}`);
  return groups[0] ?? null;
}

export async function addSubstitutionItem(nutritionistId: string, data: CreateSubstitutionItemInput) {
  const group = await getSubstitutionGroupById({ nutritionistId, groupId: data.groupId });
  if (!group) throw new Error("Grupo de substituicao nao encontrado.");

  const id = randomUUID();
  const now = new Date();
  const [item] = await prisma.$queryRaw<MealSubstitutionItemDTO[]>`
    INSERT INTO "meal_substitution_items" (
      "id", "nutritionistId", "groupId", "foodName", "source", "tacoFoodId", "quantity",
      "unit", "householdMeasure", "calories", "protein", "carbs", "fat", "fiber", "sodium",
      "equivalenceNotes", "position", "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${nutritionistId}, ${data.groupId}, ${data.foodName}, CAST(${data.source} AS "SubstitutionItemSource"),
      ${data.tacoFoodId ?? null}, ${data.quantity ?? null}, ${data.unit ?? null}, ${data.householdMeasure ?? null},
      ${data.calories ?? null}, ${data.protein ?? null}, ${data.carbs ?? null}, ${data.fat ?? null},
      ${data.fiber ?? null}, ${data.sodium ?? null}, ${data.equivalenceNotes ?? null}, ${data.position}, ${now}, ${now}
    )
    RETURNING *
  `;
  return item;
}

export async function updateSubstitutionItem(nutritionistId: string, data: UpdateSubstitutionItemInput) {
  const [existing] = await prisma.$queryRaw<MealSubstitutionItemDTO[]>`
    SELECT item.* FROM "meal_substitution_items" item
    INNER JOIN "meal_substitution_groups" grp ON grp."id" = item."groupId"
    WHERE item."id" = ${data.id} AND item."nutritionistId" = ${nutritionistId} AND grp."nutritionistId" = ${nutritionistId}
  `;
  if (!existing) throw new Error("Substituto nao encontrado.");

  const updated = {
    groupId: data.groupId ?? existing.groupId,
    foodName: data.foodName ?? existing.foodName,
    source: data.source ?? existing.source,
    tacoFoodId: data.tacoFoodId === undefined ? existing.tacoFoodId : data.tacoFoodId,
    quantity: data.quantity === undefined ? existing.quantity : data.quantity,
    unit: data.unit === undefined ? existing.unit : data.unit,
    householdMeasure: data.householdMeasure === undefined ? existing.householdMeasure : data.householdMeasure,
    calories: data.calories === undefined ? existing.calories : data.calories,
    protein: data.protein === undefined ? existing.protein : data.protein,
    carbs: data.carbs === undefined ? existing.carbs : data.carbs,
    fat: data.fat === undefined ? existing.fat : data.fat,
    fiber: data.fiber === undefined ? existing.fiber : data.fiber,
    sodium: data.sodium === undefined ? existing.sodium : data.sodium,
    equivalenceNotes: data.equivalenceNotes === undefined ? existing.equivalenceNotes : data.equivalenceNotes,
    position: data.position ?? existing.position,
  };

  const group = await getSubstitutionGroupById({ nutritionistId, groupId: updated.groupId });
  if (!group) throw new Error("Grupo de substituicao nao encontrado.");

  const [item] = await prisma.$queryRaw<MealSubstitutionItemDTO[]>`
    UPDATE "meal_substitution_items"
    SET "groupId" = ${updated.groupId}, "foodName" = ${updated.foodName}, "source" = CAST(${updated.source} AS "SubstitutionItemSource"),
      "tacoFoodId" = ${updated.tacoFoodId}, "quantity" = ${updated.quantity}, "unit" = ${updated.unit},
      "householdMeasure" = ${updated.householdMeasure}, "calories" = ${updated.calories}, "protein" = ${updated.protein},
      "carbs" = ${updated.carbs}, "fat" = ${updated.fat}, "fiber" = ${updated.fiber}, "sodium" = ${updated.sodium},
      "equivalenceNotes" = ${updated.equivalenceNotes}, "position" = ${updated.position}, "updatedAt" = ${new Date()}
    WHERE "id" = ${data.id} AND "nutritionistId" = ${nutritionistId}
    RETURNING *
  `;
  return item;
}

export async function deleteSubstitutionItem(input: { nutritionistId: string; itemId: string }) {
  const result = await prisma.$executeRaw`
    DELETE FROM "meal_substitution_items"
    WHERE "id" = ${input.itemId} AND "nutritionistId" = ${input.nutritionistId}
  `;
  if (result === 0) throw new Error("Substituto nao encontrado.");
}

export async function reorderSubstitutionItems(nutritionistId: string, data: ReorderSubstitutionItemsInput) {
  const group = await getSubstitutionGroupById({ nutritionistId, groupId: data.groupId });
  if (!group) throw new Error("Grupo de substituicao nao encontrado.");
  await prisma.$transaction(
    data.itemIds.map((id, position) =>
      prisma.$executeRaw`
        UPDATE "meal_substitution_items"
        SET "position" = ${position}, "updatedAt" = ${new Date()}
        WHERE "id" = ${id} AND "groupId" = ${data.groupId} AND "nutritionistId" = ${nutritionistId}
      `,
    ),
  );
}

export async function duplicateSubstitutionGroupsForMealPlan(input: { nutritionistId: string; fromMealPlanId: string; toMealPlanId: string }) {
  const groups = await getSubstitutionGroupsByMealPlan({ nutritionistId: input.nutritionistId, mealPlanId: input.fromMealPlanId });
  await assertMealPlanAccess(input.nutritionistId, input.toMealPlanId);

  return prisma.$transaction(async () => {
    const created: MealSubstitutionGroupDTO[] = [];
    for (const group of groups) {
      const newGroup = await createSubstitutionGroup(input.nutritionistId, {
        mealPlanId: input.toMealPlanId,
        type: group.type,
        title: group.title,
        description: group.description,
        equivalenceBasis: group.equivalenceBasis,
        targetCalories: group.targetCalories ?? undefined,
        targetProtein: group.targetProtein ?? undefined,
        targetCarbs: group.targetCarbs ?? undefined,
        targetFat: group.targetFat ?? undefined,
        targetQuantity: group.targetQuantity ?? undefined,
        targetUnit: group.targetUnit,
        visibleToPatient: group.visibleToPatient,
        notes: group.notes,
        position: group.position,
      });
      for (const item of group.items) {
        await addSubstitutionItem(input.nutritionistId, {
          groupId: newGroup.id,
          foodName: item.foodName,
          source: item.source,
          tacoFoodId: item.tacoFoodId,
          quantity: item.quantity ?? undefined,
          unit: item.unit,
          householdMeasure: item.householdMeasure,
          calories: item.calories ?? undefined,
          protein: item.protein ?? undefined,
          carbs: item.carbs ?? undefined,
          fat: item.fat ?? undefined,
          fiber: item.fiber ?? undefined,
          sodium: item.sodium ?? undefined,
          equivalenceNotes: item.equivalenceNotes,
          position: item.position,
        });
      }
      created.push(newGroup);
    }
    return created;
  });
}

export const copySubstitutionsFromTemplateToPatientPlan = duplicateSubstitutionGroupsForMealPlan;

export function calculateSubstitutionItemNutrition(input: { foodPer100g: FoodPer100g; quantityInGrams: number }) {
  return calculateNutritionByQuantity(input.foodPer100g, input.quantityInGrams);
}

export function suggestEquivalentPortion(input: SuggestEquivalentPortionInput): number | null {
  const baseItem = input.baseItem as NutritionBasis;
  switch (input.basis) {
    case "CALORIES":
      return calculateEquivalentByCalories(baseItem, input.candidateFood);
    case "CARBS":
      return calculateEquivalentByCarbs(baseItem, input.candidateFood);
    case "PROTEIN":
      return calculateEquivalentByProtein(baseItem, input.candidateFood);
    case "FAT":
      return calculateEquivalentByFat(baseItem, input.candidateFood);
    default:
      return null;
  }
}
