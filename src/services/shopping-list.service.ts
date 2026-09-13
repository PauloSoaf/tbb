/**
 * shopping-list.service.ts
 * Service functions for shopping list management.
 * All functions validate nutritionistId + patientId for multi-tenant security.
 */

import { prisma } from "@/lib/prisma";
import { ShoppingListStatus } from "@prisma/client";
import {
  CreateShoppingListInput,
  CreateShoppingListItemInput,
  UpdateShoppingListItemInput,
  UpdateShoppingListInput,
} from "@/validation/shopping-list.schema";
import {
  generateShoppingListFromMealPlan,
  formatShoppingListText,
} from "@/lib/utils/shopping-list";
import { normalizeFoodName, inferShoppingCategory } from "@/lib/utils/food-normalization";

// ─── Generate from active plan ────────────────────────────────────────────────

export async function generateShoppingListFromActivePlan(input: {
  nutritionistId: string;
  patientId: string;
  mealPlanId: string;
  periodDays: number;
  title?: string;
}) {
  const { nutritionistId, patientId, mealPlanId, periodDays, title } = input;

  // Validate plan belongs to this patient and tenant
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id: mealPlanId,
      nutritionistId,
      patientId,
      isTemplate: false,
    },
    include: {
      meals: {
        orderBy: { position: "asc" },
        include: {
          items: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!mealPlan) throw new Error("Plano alimentar não encontrado ou sem permissão.");

  // Archive current active lists for this patient
  await prisma.shoppingList.updateMany({
    where: { nutritionistId, patientId, status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });

  // Generate draft
  const draft = generateShoppingListFromMealPlan({
    mealPlan: {
      id: mealPlan.id,
      title: mealPlan.title,
      patientId: mealPlan.patientId,
      meals: mealPlan.meals.map((m) => ({
        name: m.name,
        items: m.items.map((i) => ({
          foodName: i.foodName,
          quantity: i.quantity,
          unit: i.unit,
          householdMeasure: i.householdMeasure ?? null,
          mealItemId: i.id,
          tacoFoodId: i.tacoFoodId ?? null,
        })),
      })),
    },
    periodDays,
    title,
  });

  // Create in DB
  const shoppingList = await prisma.shoppingList.create({
    data: {
      nutritionistId,
      patientId,
      mealPlanId: mealPlan.id,
      title: draft.title,
      periodDays,
      generatedFromPlan: true,
      status: "ACTIVE",
      items: {
        create: draft.items.map((item) => ({
          nutritionistId,
          name: item.name,
          normalizedName: item.normalizedName,
          category: item.category,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          householdMeasure: item.householdMeasure ?? null,
          source: item.source,
          mealItemId: item.mealItemId ?? null,
          tacoFoodId: item.tacoFoodId ?? null,
          position: item.position,
        })),
      },
    },
    include: {
      items: { orderBy: { position: "asc" } },
      mealPlan: { select: { id: true, title: true } },
    },
  });

  return shoppingList;
}

// ─── Get lists by patient ────────────────────────────────────────────────────

export async function getShoppingListsByPatient(input: {
  nutritionistId: string;
  patientId: string;
  take?: number;
}) {
  const { nutritionistId, patientId, take = 10 } = input;
  return prisma.shoppingList.findMany({
    where: { nutritionistId, patientId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: { orderBy: { position: "asc" } },
      mealPlan: { select: { id: true, title: true } },
    },
  });
}

// ─── Get active list ─────────────────────────────────────────────────────────

export async function getActiveShoppingList(input: {
  nutritionistId: string;
  patientId: string;
}) {
  const { nutritionistId, patientId } = input;
  return prisma.shoppingList.findFirst({
    where: { nutritionistId, patientId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { position: "asc" } },
      mealPlan: { select: { id: true, title: true, status: true } },
    },
  });
}

// ─── Get by ID ───────────────────────────────────────────────────────────────

export async function getShoppingListById(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
}) {
  const { nutritionistId, patientId, shoppingListId } = input;
  return prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
    include: {
      items: { orderBy: { position: "asc" } },
      mealPlan: { select: { id: true, title: true } },
    },
  });
}

// ─── Update list ─────────────────────────────────────────────────────────────

export async function createShoppingList(input: {
  nutritionistId: string;
  patientId: string;
  data: CreateShoppingListInput;
}) {
  const { nutritionistId, patientId, data } = input;

  if (data.mealPlanId) {
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id: data.mealPlanId,
        nutritionistId,
        patientId,
        isTemplate: false,
      },
      select: { id: true },
    });
    if (!mealPlan) throw new Error("Plano alimentar nao encontrado.");
  }

  return prisma.shoppingList.create({
    data: {
      nutritionistId,
      patientId,
      mealPlanId: data.mealPlanId ?? null,
      title: data.title,
      periodDays: data.periodDays,
      notes: data.notes ?? null,
      generatedFromPlan: data.generatedFromPlan,
      status: ShoppingListStatus.ACTIVE,
    },
    include: {
      items: { orderBy: { position: "asc" } },
      mealPlan: { select: { id: true, title: true } },
    },
  });
}

export async function updateShoppingList(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  data: UpdateShoppingListInput;
}) {
  const { nutritionistId, patientId, shoppingListId, data } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
  });
  if (!list) throw new Error("Lista de compras não encontrada.");

  return prisma.shoppingList.update({
    where: { id: shoppingListId },
    data,
    include: { items: { orderBy: { position: "asc" } } },
  });
}

// ─── Archive list ────────────────────────────────────────────────────────────

export async function archiveShoppingList(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
}) {
  const { nutritionistId, patientId, shoppingListId } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
  });
  if (!list) throw new Error("Lista de compras não encontrada.");

  return prisma.shoppingList.update({
    where: { id: shoppingListId },
    data: { status: ShoppingListStatus.ARCHIVED },
  });
}

// ─── Delete list ──────────────────────────────────────────────────────────────

export async function deleteShoppingList(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
}) {
  const { nutritionistId, patientId, shoppingListId } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
  });
  if (!list) throw new Error("Lista de compras não encontrada.");

  return prisma.shoppingList.delete({ where: { id: shoppingListId } });
}

// ─── Add item ────────────────────────────────────────────────────────────────

export async function addShoppingListItem(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  data: CreateShoppingListItemInput;
}) {
  const { nutritionistId, patientId, shoppingListId, data } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
  });
  if (!list) throw new Error("Lista de compras não encontrada.");

  // Get max position
  const maxPos = await prisma.shoppingListItem.findFirst({
    where: { shoppingListId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return prisma.shoppingListItem.create({
    data: {
      nutritionistId,
      shoppingListId,
      name: data.name,
      normalizedName: normalizeFoodName(data.name),
      category: data.category ?? inferShoppingCategory(data.name),
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      householdMeasure: data.householdMeasure ?? null,
      source: data.source ?? "MANUAL",
      mealItemId: data.mealItemId ?? null,
      tacoFoodId: data.tacoFoodId ?? null,
      notes: data.notes ?? null,
      position: (maxPos?.position ?? -1) + 1,
    },
  });
}

// ─── Update item ─────────────────────────────────────────────────────────────

export async function updateShoppingListItem(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  itemId: string;
  data: UpdateShoppingListItemInput;
}) {
  const { nutritionistId, patientId, shoppingListId, itemId, data } = input;

  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingListId, nutritionistId },
    include: { shoppingList: { select: { patientId: true } } },
  });
  if (!item || item.shoppingList.patientId !== patientId)
    throw new Error("Item não encontrado.");

  return prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      ...(data.name && { name: data.name, normalizedName: normalizeFoodName(data.name) }),
      ...(data.category && { category: data.category }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.householdMeasure !== undefined && { householdMeasure: data.householdMeasure }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}

// ─── Delete item ─────────────────────────────────────────────────────────────

export async function deleteShoppingListItem(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  itemId: string;
}) {
  const { nutritionistId, patientId, shoppingListId, itemId } = input;
  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingListId, nutritionistId },
    include: { shoppingList: { select: { patientId: true } } },
  });
  if (!item || item.shoppingList.patientId !== patientId)
    throw new Error("Item não encontrado.");

  return prisma.shoppingListItem.delete({ where: { id: itemId } });
}

// ─── Toggle checked ───────────────────────────────────────────────────────────

export async function toggleShoppingListItemChecked(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  itemId: string;
  checked: boolean;
}) {
  const { nutritionistId, patientId, shoppingListId, itemId, checked } = input;
  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingListId, nutritionistId },
    include: { shoppingList: { select: { patientId: true } } },
  });
  if (!item || item.shoppingList.patientId !== patientId)
    throw new Error("Item não encontrado.");

  return prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      checked,
      checkedAt: checked ? new Date() : null,
    },
  });
}

// ─── Copy as text ─────────────────────────────────────────────────────────────

export async function reorderShoppingListItems(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
  itemIds: string[];
}) {
  const { nutritionistId, patientId, shoppingListId, itemIds } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
    select: { id: true },
  });
  if (!list) throw new Error("Lista de compras nao encontrada.");

  const existingItems = await prisma.shoppingListItem.findMany({
    where: { shoppingListId, nutritionistId, id: { in: itemIds } },
    select: { id: true },
  });
  if (existingItems.length !== itemIds.length) {
    throw new Error("Um ou mais itens nao pertencem a lista.");
  }

  await prisma.$transaction(
    itemIds.map((itemId, position) =>
      prisma.shoppingListItem.update({
        where: { id: itemId },
        data: { position },
      })
    )
  );

  return prisma.shoppingListItem.findMany({
    where: { shoppingListId, nutritionistId },
    orderBy: { position: "asc" },
  });
}

export async function getShoppingListAsText(input: {
  nutritionistId: string;
  patientId: string;
  shoppingListId: string;
}): Promise<string> {
  const { nutritionistId, patientId, shoppingListId } = input;
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, nutritionistId, patientId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!list) throw new Error("Lista de compras não encontrada.");

  return formatShoppingListText({
    title: list.title,
    periodDays: list.periodDays,
    items: list.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      checked: i.checked,
    })),
  });
}
