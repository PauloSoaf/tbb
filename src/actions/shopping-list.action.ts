"use server";

/**
 * shopping-list.action.ts
 * Server actions for shopping list feature.
 * Portal actions: patientId comes from session (never trusted from client).
 * Dashboard actions: nutritionistId comes from session.
 */

import { invalidatePortalShopping } from "@/lib/cache/invalidate-nutriopus-cache";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import {
  generateShoppingListFromActivePlan,
  getActiveShoppingList,
  getShoppingListsByPatient,
  getShoppingListById,
  archiveShoppingList,
  deleteShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  toggleShoppingListItemChecked,
  getShoppingListAsText,
} from "@/services/shopping-list.service";
import { generateShoppingListSchema, createShoppingListItemSchema, updateShoppingListItemSchema } from "@/validation/shopping-list.schema";

// ─── Helper: get patient session ──────────────────────────────────────────────

async function requirePatientSession(tenantSlug: string) {
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenantSlug) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }
  return session;
}

// ─── Helper: get nutritionist session ────────────────────────────────────────

async function requireNutritionistSession() {
  const session = await getSessionFromCookies();
  if (!session) throw new Error("Sessão inválida.");
  return session;
}

// ─── Portal actions (patient) ─────────────────────────────────────────────────

/**
 * Generates a shopping list from the active meal plan.
 * Called from the patient portal.
 */
export async function generateShoppingListAction(
  tenantSlug: string,
  rawData: { mealPlanId: string; periodDays: number; title?: string }
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    const data = generateShoppingListSchema.parse(rawData);

    const list = await generateShoppingListFromActivePlan({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      mealPlanId: data.mealPlanId,
      periodDays: data.periodDays,
      title: data.title,
    });

    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true, list };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar lista.";
    return { success: false, error: message };
  }
}

/**
 * Archives the current active shopping list.
 */
export async function archiveShoppingListAction(
  tenantSlug: string,
  shoppingListId: string
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    await archiveShoppingList({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
    });
    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao arquivar lista.";
    return { success: false, error: message };
  }
}

/**
 * Deletes a shopping list.
 */
export async function deleteShoppingListAction(
  tenantSlug: string,
  shoppingListId: string
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    await deleteShoppingList({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
    });
    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir lista.";
    return { success: false, error: message };
  }
}

/**
 * Adds a manual item to the shopping list.
 */
export async function addShoppingListItemAction(
  tenantSlug: string,
  shoppingListId: string,
  rawData: unknown
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    const data = createShoppingListItemSchema.parse(rawData);
    const item = await addShoppingListItem({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
      data,
    });
    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true, item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar item.";
    return { success: false, error: message };
  }
}

/**
 * Updates a shopping list item (name, quantity, unit, etc.)
 */
export async function updateShoppingListItemAction(
  tenantSlug: string,
  shoppingListId: string,
  itemId: string,
  rawData: unknown
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    const data = updateShoppingListItemSchema.parse(rawData);
    const item = await updateShoppingListItem({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
      itemId,
      data,
    });
    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true, item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar item.";
    return { success: false, error: message };
  }
}

/**
 * Deletes a shopping list item.
 */
export async function deleteShoppingListItemAction(
  tenantSlug: string,
  shoppingListId: string,
  itemId: string
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    await deleteShoppingListItem({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
      itemId,
    });
    invalidatePortalShopping({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item.";
    return { success: false, error: message };
  }
}

/**
 * Toggles an item's checked state.
 */
export async function toggleShoppingListItemCheckedAction(
  tenantSlug: string,
  shoppingListId: string,
  itemId: string,
  checked: boolean
) {
  try {
    const session = await requirePatientSession(tenantSlug);
    const item = await toggleShoppingListItemChecked({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
      itemId,
      checked,
    });
    // Don't revalidate entire page for toggle — keep it fast
    return { success: true, item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao marcar item.";
    return { success: false, error: message };
  }
}

/**
 * Returns the shopping list formatted as plain text (for copy/share).
 */
export async function copyShoppingListTextAction(
  tenantSlug: string,
  shoppingListId: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const session = await requirePatientSession(tenantSlug);
    const text = await getShoppingListAsText({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
      shoppingListId,
    });
    return { success: true, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao copiar lista.";
    return { success: false, error: message };
  }
}

// ─── Dashboard actions (nutritionist viewing patient lists) ───────────────────

export async function getNutritionistPatientShoppingListsAction(patientId: string) {
  try {
    const session = await requireNutritionistSession();
    const lists = await getShoppingListsByPatient({
      nutritionistId: session.nutritionistId,
      patientId,
      take: 5,
    });
    return { success: true, lists };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro.";
    return { success: false, error: message };
  }
}

export async function getNutritionistPatientActiveShoppingListAction(patientId: string) {
  try {
    const session = await requireNutritionistSession();
    const list = await getActiveShoppingList({
      nutritionistId: session.nutritionistId,
      patientId,
    });
    return { success: true, list };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro.";
    return { success: false, error: message };
  }
}

export async function getNutritionistShoppingListDetailAction(
  patientId: string,
  shoppingListId: string
) {
  try {
    const session = await requireNutritionistSession();
    const list = await getShoppingListById({
      nutritionistId: session.nutritionistId,
      patientId,
      shoppingListId,
    });
    return { success: true, list };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro.";
    return { success: false, error: message };
  }
}
