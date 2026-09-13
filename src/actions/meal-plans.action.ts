"use server";

import { invalidateAfterMealPlanMutation } from "@/lib/cache/invalidate-nutriopus-cache";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { CreateMealPlanInput, CreateMealInput, CreateMealItemInput, UpdateMealInput } from "@/validation/meal-plan.schema";
import * as mealPlanService from "@/services/meal-plan.service";
import {
  extractMealDraftsFromContentBlocks,
  normalizeStudioMealDraftsFromRecords,
  type SerializableJson,
  type StudioMealDraft,
} from "@/lib/meal-plan/studio-content";
import type { MealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";
import { nativeMealPlanTemplates } from "@/data/meal-plan-templates";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function createMealPlanAction(tenantSlug: string, data: CreateMealPlanInput) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "create", tenantSlug, { throwOnFailure: true });
    const plan = await mealPlanService.createMealPlan(nutritionist.id, data);
    
    invalidateAfterMealPlanMutation({
      nutritionistId: nutritionist.id,
      tenant: tenantSlug,
      patientId: data.patientId,
      mealPlanId: plan.id,
    });
    return { success: true, planId: plan.id };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao criar plano.") };
  }
}

export async function addMealAction(tenantSlug: string, data: CreateMealInput) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const meal = await mealPlanService.addMealToPlan(nutritionist.id, data);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true, meal };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao adicionar refeição.") };
  }
}

export async function updateMealAction(tenantSlug: string, mealId: string, data: UpdateMealInput) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.updateMeal(nutritionist.id, mealId, data);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao atualizar refeição.") };
  }
}

export async function deleteMealAction(tenantSlug: string, mealId: string) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.deleteMeal(nutritionist.id, mealId);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao deletar refeição.") };
  }
}

export async function addMealItemAction(tenantSlug: string, data: CreateMealItemInput) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const item = await mealPlanService.addMealItem(nutritionist.id, data);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true, item };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao adicionar alimento.") };
  }
}

export async function deleteMealItemAction(tenantSlug: string, itemId: string) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.deleteMealItem(nutritionist.id, itemId);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao remover alimento.") };
  }
}

export async function activateMealPlanAction(tenantSlug: string, mealPlanId: string) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.activateMealPlan(nutritionist.id, mealPlanId);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao ativar plano.") };
  }
}

export async function saveMealPlanTotalsAction(tenantSlug: string, mealPlanId: string, totals: { calories: number; protein: number; carbs: number; fat: number }) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "create", tenantSlug, { throwOnFailure: true });
    await mealPlanService.updateMealPlanTotals(nutritionist.id, mealPlanId, totals);
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao atualizar totais.") };
  }
}

export async function createBlankMealPlanAction(
  tenantSlug: string,
  opts: { isTemplate?: boolean; patientId?: string | null; title?: string }
) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const plan = await mealPlanService.createBlankMealPlan(nutritionist.id, opts);
    invalidateAfterMealPlanMutation({
      nutritionistId: nutritionist.id,
      tenant: tenantSlug,
      mealPlanId: plan.id,
    });
    return { success: true, planId: plan.id };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao criar plano.") };
  }
}

export async function saveDraftAction(
  tenantSlug: string,
  mealPlanId: string,
  data: {
    title?: string;
    objective?: string;
    description?: string;
    notes?: string;
    layoutMode?: string;
    targetCalories?: number;
    patientId?: string | null;
    isTemplate?: boolean;
    contentBlocks?: Record<string, SerializableJson>;
    pdfStyle?: MealPlanPdfStyle;
    meals?: StudioMealDraft[];
  }
) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.saveMealPlanDraft(nutritionist.id, mealPlanId, data);
    invalidateAfterMealPlanMutation({ nutritionistId: nutritionist.id, tenant: tenantSlug, mealPlanId });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao salvar rascunho.") };
  }
}

export async function saveLayoutAction(
  tenantSlug: string,
  mealPlanId: string,
  layoutMode: string
) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    await mealPlanService.saveMealPlanDraft(nutritionist.id, mealPlanId, { layoutMode });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao salvar layout.") };
  }
}

export async function replaceMealPlanFromTemplateAction(
  tenantSlug: string,
  mealPlanId: string,
  templateId: string,
  isNative: boolean
) {
  try {
    const { nutritionist } = await requirePermission("mealPlans", "edit", tenantSlug, { throwOnFailure: true });
    const nativeTemplate = isNative
      ? nativeMealPlanTemplates.find((template) => template.id === templateId)
      : null;
    const customTemplate = isNative
      ? null
      : await mealPlanService.getMealPlanStudioData(nutritionist.id, templateId);
    const customTemplateContentMeals = customTemplate
      ? extractMealDraftsFromContentBlocks(customTemplate.contentBlocks)
      : [];

    if (isNative && !nativeTemplate) throw new Error("Modelo NutriOpus não encontrado.");
    if (!isNative && (!customTemplate || !customTemplate.isTemplate)) {
      throw new Error("Modelo não encontrado.");
    }

    const source = nativeTemplate
      ? {
          title: nativeTemplate.title,
          objective: nativeTemplate.objective,
          description: nativeTemplate.description,
          notes: null,
          totalCalories: nativeTemplate.totals.calories,
          totalCarbs: nativeTemplate.totals.carbs,
          totalProtein: nativeTemplate.totals.protein,
          totalFat: nativeTemplate.totals.fat,
          targetCalories: nativeTemplate.totals.calories,
          contentBlocks: null,
          meals: normalizeStudioMealDraftsFromRecords(nativeTemplate.meals),
        }
      : {
          title: customTemplate!.title,
          objective: customTemplate!.objective,
          description: customTemplate!.description,
          notes: customTemplate!.notes,
          totalCalories: customTemplate!.totalCalories,
          totalCarbs: customTemplate!.totalCarbs,
          totalProtein: customTemplate!.totalProtein,
          totalFat: customTemplate!.totalFat,
          targetCalories: customTemplate!.targetCalories,
          contentBlocks: customTemplate!.contentBlocks,
          meals: customTemplateContentMeals.length > 0
            ? customTemplateContentMeals
            : normalizeStudioMealDraftsFromRecords(customTemplate!.meals),
        };

    const result = await mealPlanService.replaceMealPlanFromTemplate(
      nutritionist.id,
      mealPlanId,
      source
    );
    invalidateAfterMealPlanMutation({
      nutritionistId: nutritionist.id,
      tenant: tenantSlug,
      mealPlanId,
      patientId: result.patientId ?? undefined,
    });

    return { success: true, plan: result.plan };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Não foi possível copiar o modelo.") };
  }
}
