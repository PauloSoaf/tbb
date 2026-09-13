"use server";

import { requirePermission } from "@/lib/tenancy/requirePermission";
import {
  deleteMealPlanLibraryFood,
  deleteMealPlanLibraryMeal,
  registerMealPlanLibraryUse,
  saveMealPlanLibraryFood,
  saveMealPlanLibraryMeal,
} from "@/services/meal-plan-library.service";
import {
  mealPlanLibraryIdSchema,
  saveMealPlanLibraryFoodSchema,
  saveMealPlanLibraryMealSchema,
} from "@/validation/meal-plan-library.schema";

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message || "Dados inválidos para a biblioteca.";
}

function actionError(error: unknown, fallback: string) {
  return { error: error instanceof Error ? error.message : fallback };
}

export async function saveMealPlanLibraryFoodAction(tenantSlug: string, input: unknown) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const parsed = saveMealPlanLibraryFoodSchema.safeParse(input);
    if (!parsed.success) return { error: validationMessage(parsed.error) };
    const food = await saveMealPlanLibraryFood(nutritionist.id, parsed.data);
    return { success: true, food };
  } catch (error) {
    return actionError(error, "Não foi possível salvar o alimento na biblioteca.");
  }
}

export async function saveMealPlanLibraryMealAction(tenantSlug: string, input: unknown) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const parsed = saveMealPlanLibraryMealSchema.safeParse(input);
    if (!parsed.success) return { error: validationMessage(parsed.error) };
    const meal = await saveMealPlanLibraryMeal(nutritionist.id, parsed.data);
    return { success: true, meal };
  } catch (error) {
    return actionError(error, "Não foi possível salvar a refeição na biblioteca.");
  }
}

export async function deleteMealPlanLibraryFoodAction(tenantSlug: string, id: string) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const parsedId = mealPlanLibraryIdSchema.safeParse(id);
    if (!parsedId.success) return { error: validationMessage(parsedId.error) };
    await deleteMealPlanLibraryFood(nutritionist.id, parsedId.data);
    return { success: true };
  } catch (error) {
    return actionError(error, "Não foi possível excluir o alimento salvo.");
  }
}

export async function deleteMealPlanLibraryMealAction(tenantSlug: string, id: string) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const parsedId = mealPlanLibraryIdSchema.safeParse(id);
    if (!parsedId.success) return { error: validationMessage(parsedId.error) };
    await deleteMealPlanLibraryMeal(nutritionist.id, parsedId.data);
    return { success: true };
  } catch (error) {
    return actionError(error, "Não foi possível excluir a refeição salva.");
  }
}

export async function registerMealPlanLibraryUseAction(
  tenantSlug: string,
  input: { type: "MEAL" | "FOOD"; id: string },
) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const parsedId = mealPlanLibraryIdSchema.safeParse(input.id);
    if (!parsedId.success || (input.type !== "MEAL" && input.type !== "FOOD")) {
      return { error: "Item inválido da biblioteca." };
    }
    await registerMealPlanLibraryUse(nutritionist.id, { type: input.type, id: parsedId.data });
    return { success: true };
  } catch (error) {
    return actionError(error, "Não foi possível registrar o uso do item.");
  }
}
