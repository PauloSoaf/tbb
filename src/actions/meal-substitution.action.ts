"use server";

import { invalidateAfterMealPlanMutation } from "@/lib/cache/invalidate-nutriopus-cache";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import {
  createSubstitutionGroupSchema,
  createSubstitutionItemSchema,
  reorderSubstitutionItemsSchema,
  suggestEquivalentPortionSchema,
  updateSubstitutionGroupSchema,
  updateSubstitutionItemSchema,
} from "@/validation/meal-substitution.schema";
import * as substitutionService from "@/services/meal-substitution.service";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateMealSubstitutionPaths(
  nutritionistId: string,
  tenantSlug: string,
  mealPlanId?: string
) {
  invalidateAfterMealPlanMutation({ nutritionistId, tenant: tenantSlug, mealPlanId });
}

export async function getSubstitutionGroupsByMealItemAction(tenantSlug: string, mealItemId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const groups = await substitutionService.getSubstitutionGroupsByMealItem({
      nutritionistId: nutritionist.id,
      mealItemId,
    });
    return { success: true as const, groups };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao carregar substituicoes."), groups: [] };
  }
}

export async function createSubstitutionGroupAction(tenantSlug: string, data: unknown) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const parsed = createSubstitutionGroupSchema.parse(data);
    const group = await substitutionService.createSubstitutionGroup(nutritionist.id, parsed);
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug, parsed.mealPlanId);
    return { success: true as const, group };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao criar grupo de substituicao.") };
  }
}

export async function updateSubstitutionGroupAction(tenantSlug: string, data: unknown) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const parsed = updateSubstitutionGroupSchema.parse(data);
    const group = await substitutionService.updateSubstitutionGroup(nutritionist.id, parsed);
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug, group.mealPlanId);
    return { success: true as const, group };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao atualizar grupo de substituicao.") };
  }
}

export async function deleteSubstitutionGroupAction(tenantSlug: string, groupId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    await substitutionService.deleteSubstitutionGroup({ nutritionistId: nutritionist.id, groupId });
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao remover grupo de substituicao.") };
  }
}

export async function addSubstitutionItemAction(tenantSlug: string, data: unknown) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const parsed = createSubstitutionItemSchema.parse(data);
    const item = await substitutionService.addSubstitutionItem(nutritionist.id, parsed);
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug);
    return { success: true as const, item };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao adicionar substituto.") };
  }
}

export async function updateSubstitutionItemAction(tenantSlug: string, data: unknown) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const parsed = updateSubstitutionItemSchema.parse(data);
    const item = await substitutionService.updateSubstitutionItem(nutritionist.id, parsed);
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug);
    return { success: true as const, item };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao atualizar substituto.") };
  }
}

export async function deleteSubstitutionItemAction(tenantSlug: string, itemId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    await substitutionService.deleteSubstitutionItem({ nutritionistId: nutritionist.id, itemId });
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao remover substituto.") };
  }
}

export async function reorderSubstitutionItemsAction(tenantSlug: string, data: unknown) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const parsed = reorderSubstitutionItemsSchema.parse(data);
    await substitutionService.reorderSubstitutionItems(nutritionist.id, parsed);
    revalidateMealSubstitutionPaths(nutritionist.id, tenantSlug);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao reordenar substitutos.") };
  }
}

export async function suggestEquivalentPortionAction(data: unknown) {
  try {
    const parsed = suggestEquivalentPortionSchema.parse(data);
    return { success: true as const, quantityInGrams: substitutionService.suggestEquivalentPortion(parsed) };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Nao foi possivel calcular equivalencia.") };
  }
}
