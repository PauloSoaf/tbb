"use server";

import {
  invalidateAfterMealPlanMutation,
  invalidateTemplates,
  invalidatePatientDetail,
} from "@/lib/cache/invalidate-nutriopus-cache";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { createTemplate, deleteTemplate } from "@/services/template.service";
import { MealItemSource, type Prisma } from "@prisma/client";
import { uploadTrackedFile, deleteTrackedFile, StorageQuotaExceededError } from "@/lib/storage/tracked-upload";
import { getPatientHref } from "@/services/patient-route.service";

import { prisma } from "@/lib/prisma";
import { nativeMealPlanTemplates } from "@/data/meal-plan-templates";
import { extractMealDraftsFromContentBlocks } from "@/lib/meal-plan/studio-content";

type MealPlanWithMeals = Prisma.MealPlanGetPayload<{
  include: { meals: { include: { items: true } } };
}>;

type CopyableMealItem = {
  foodName: string;
  source?: MealItemSource;
  tacoFoodId?: string | null;
  quantity: number;
  unit: string;
  householdMeasure?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sodium?: number | null;
  notes?: string | null;
  position: number;
};

type CopyableMeal = {
  name: string;
  time?: string | null;
  position: number;
  notes?: string | null;
  imageUrl?: string | null;
  items: CopyableMealItem[];
};

type CopyablePlan = Pick<
  MealPlanWithMeals,
  "title" | "objective" | "description" | "notes" | "totalCalories" | "totalCarbs" | "totalProtein" | "totalFat" | "contentBlocks" | "layoutMode" | "targetCalories"
> & {
  meals: CopyableMeal[];
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createMealsPayload(nutritionistId: string, meals: CopyableMeal[]) {
  return meals.map((meal) => ({
    nutritionistId,
    name: meal.name,
    time: meal.time,
    position: meal.position,
    notes: meal.notes,
    imageUrl: meal.imageUrl,
    items: {
      create: meal.items.map((item) => ({
        nutritionistId,
        foodName: item.foodName,
        source: item.source ?? MealItemSource.CUSTOM,
        tacoFoodId: item.tacoFoodId,
        quantity: item.quantity,
        unit: item.unit,
        householdMeasure: item.householdMeasure,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        sodium: item.sodium,
        notes: item.notes,
        position: item.position,
      })),
    },
  }));
}

function getCopyableMealsFromPlan(plan: CopyablePlan): CopyableMeal[] {
  if (plan.meals.length > 0) return plan.meals;

  return extractMealDraftsFromContentBlocks(plan.contentBlocks).map((meal) => ({
    name: meal.name,
    time: meal.time,
    position: meal.position,
    notes: meal.notes,
    imageUrl: meal.imageUrl,
    items: meal.items.map((item) => ({
      foodName: item.foodName,
      source: item.source === "TACO" ? MealItemSource.TACO : MealItemSource.CUSTOM,
      tacoFoodId: item.tacoFoodId,
      quantity: item.quantity,
      unit: item.unit,
      householdMeasure: item.householdMeasure,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sodium: item.sodium,
      notes: item.notes,
      position: item.position,
    })),
  }));
}

export async function createTextTemplateAction(
  tenant: string,
  title: string,
  content: string
) {
  const { session } = await assertTenantAccess(tenant);

  try {
    await createTemplate(session.nutritionistId, {
      title,
      type: "TEXT",
      content,
    });

    invalidateTemplates({ nutritionistId: session.nutritionistId, tenant });
    return { success: true };
  } catch (error) {
    console.error("Create text template error:", error);
    return { error: "Erro ao salvar o modelo de texto." };
  }
}

export async function uploadFileTemplateAction(
  tenant: string,
  formData: FormData
) {
  const { session } = await assertTenantAccess(tenant);

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;

  if (!file || !title) {
    return { error: "Arquivo ou título ausente." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "O arquivo excede o limite de 5MB." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadTrackedFile(session.nutritionistId, buffer, {
      fileName: file.name,
      folder: "templates",
      purpose: "meal-template-file",
      uploadedByUserId: session.userId,
    });

    await createTemplate(session.nutritionistId, {
      title,
      type: "FILE",
      fileName: file.name,
      fileUrl,
      mimeType: file.type,
      size: file.size,
    });

    invalidateTemplates({ nutritionistId: session.nutritionistId, tenant });
    return { success: true };
  } catch (error) {
    if (error instanceof StorageQuotaExceededError) {
      return { error: error.message };
    }
    console.error("Upload template error:", error);
    return { error: "Erro interno ao processar o upload do modelo." };
  }
}

export async function deleteTemplateAction(
  tenant: string,
  templateId: string,
  fileUrl?: string | null
) {
  const { session } = await assertTenantAccess(tenant);

  try {
    if (fileUrl) {
      await deleteTrackedFile(session.nutritionistId, fileUrl).catch(() => {});
    }

    await deleteTemplate(session.nutritionistId, templateId);

    invalidateTemplates({ nutritionistId: session.nutritionistId, tenant });
    return { success: true };
  } catch (error) {
    console.error("Delete template error:", error);
    return { error: "Erro ao excluir o modelo." };
  }
}

export async function duplicateTemplateAction(tenantSlug: string, templateId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    
    // Fetch original template with meals and items
    let original: CopyablePlan | null = await prisma.mealPlan.findFirst({
      where: { id: templateId, nutritionistId: nutritionist.id },
      include: {
        meals: {
          include: { items: true }
        }
      }
    });

    if (!original) {
      const native = nativeMealPlanTemplates.find(t => t.id === templateId);
      if (!native) throw new Error("Modelo não encontrado");
      
      original = {
        title: native.title,
        objective: native.objective,
        description: native.description,
        notes: "",
        totalCalories: native.totals.calories,
        totalCarbs: native.totals.carbs,
        totalProtein: native.totals.protein,
        totalFat: native.totals.fat,
        contentBlocks: null,
        layoutMode: "CLINICAL",
        targetCalories: native.totals.calories,
        meals: native.meals.map((m, i) => ({
          name: m.name,
          time: m.time,
          position: i,
          notes: m.notes || "",
          imageUrl: null,
          items: m.items.map((it, j) => ({
            foodName: it.foodName,
            source: MealItemSource.CUSTOM,
            quantity: it.quantity,
            unit: it.unit,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            position: j
          }))
        }))
      };
    }

    const sourcePlan = original;
    const sourceMeals = getCopyableMealsFromPlan(sourcePlan);

    // Create the duplicate
    const newTemplate = await prisma.mealPlan.create({
      data: {
        nutritionistId: nutritionist.id,
        title: `${sourcePlan.title} (Cópia)`,
        isTemplate: true,
        objective: sourcePlan.objective,
        description: sourcePlan.description,
        notes: sourcePlan.notes,
        totalCalories: sourcePlan.totalCalories,
        totalCarbs: sourcePlan.totalCarbs,
        totalProtein: sourcePlan.totalProtein,
        totalFat: sourcePlan.totalFat,
        layoutMode: sourcePlan.layoutMode,
        contentBlocks: sourcePlan.contentBlocks ?? undefined,
        targetCalories: sourcePlan.targetCalories,
        meals: {
          create: createMealsPayload(nutritionist.id, sourceMeals),
        }
      }
    });

    invalidateTemplates({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    invalidateAfterMealPlanMutation({
      nutritionistId: nutritionist.id,
      tenant: tenantSlug,
      mealPlanId: newTemplate.id,
    });
    return { success: true, newTemplateId: newTemplate.id };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao duplicar modelo.") };
  }
}

export async function deleteMealPlanTemplateAction(tenantSlug: string, templateId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);
    const template = await prisma.mealPlan.findFirst({
      where: { id: templateId, nutritionistId: nutritionist.id, isTemplate: true },
      select: { id: true },
    });

    if (!template) throw new Error("Modelo não encontrado.");

    await prisma.mealPlan.delete({ where: { id: templateId } });
    invalidateTemplates({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao excluir modelo.") };
  }
}

export async function applyTemplateToPatientAction(tenantSlug: string, templateId: string, patientId: string) {
  try {
    const { nutritionist } = await assertTenantAccess(tenantSlug);

    let original: CopyablePlan | null = await prisma.mealPlan.findFirst({
      where: { id: templateId, nutritionistId: nutritionist.id },
      include: {
        meals: { include: { items: true } }
      }
    });

    if (!original) {
      const native = nativeMealPlanTemplates.find(t => t.id === templateId);
      if (!native) throw new Error("Modelo não encontrado");
      
      original = {
        title: native.title,
        objective: native.objective,
        description: native.description,
        notes: "",
        totalCalories: native.totals.calories,
        totalCarbs: native.totals.carbs,
        totalProtein: native.totals.protein,
        totalFat: native.totals.fat,
        contentBlocks: null,
        layoutMode: "CLINICAL",
        targetCalories: native.totals.calories,
        meals: native.meals.map((m, i) => ({
          name: m.name,
          time: m.time,
          position: i,
          notes: m.notes || "",
          imageUrl: null,
          items: m.items.map((it, j) => ({
            foodName: it.foodName,
            source: MealItemSource.CUSTOM,
            quantity: it.quantity,
            unit: it.unit,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            position: j
          }))
        }))
      };
    }

    const sourcePlan = original;
    const sourceMeals = getCopyableMealsFromPlan(sourcePlan);

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: nutritionist.id }
    });
    
    if (!patient) throw new Error("Paciente não encontrado");

    const newPlan = await prisma.$transaction(async (tx) => {
      await tx.mealPlan.updateMany({
        where: {
          nutritionistId: nutritionist.id,
          patientId: patient.id,
          isTemplate: false,
          status: "ACTIVE",
        },
        data: { status: "ARCHIVED" },
      });

      return tx.mealPlan.create({
        data: {
          nutritionistId: nutritionist.id,
          patientId: patient.id,
          isTemplate: false,
          title: sourcePlan.title,
          objective: sourcePlan.objective,
          description: sourcePlan.description,
          notes: sourcePlan.notes,
          totalCalories: sourcePlan.totalCalories,
          totalCarbs: sourcePlan.totalCarbs,
          totalProtein: sourcePlan.totalProtein,
          totalFat: sourcePlan.totalFat,
          layoutMode: sourcePlan.layoutMode,
          contentBlocks: sourcePlan.contentBlocks ?? undefined,
          targetCalories: sourcePlan.targetCalories,
          status: "ACTIVE",
          meals: {
            create: createMealsPayload(nutritionist.id, sourceMeals),
          },
        },
      });
    });

    invalidatePatientDetail({ nutritionistId: nutritionist.id, tenant: tenantSlug, patientId: patient.id });
    invalidateTemplates({ nutritionistId: nutritionist.id, tenant: tenantSlug });
    return { success: true, newPlanId: newPlan.id, patientHref: getPatientHref({ tenant: tenantSlug, patient }) };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, "Erro ao aplicar modelo ao paciente.") };
  }
}
