import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getMealPlanStudioData } from "@/services/meal-plan.service";
import { MealPlanStudio } from "@/components/meal-plan-studio/MealPlanStudio";
import { prisma } from "@/lib/prisma";
import { nativeMealPlanTemplates } from "@/data/meal-plan-templates";
import type { ComponentProps } from "react";
import { NativeTemplateStudioRedirect } from "./NativeTemplateStudioRedirect";
import { StudioShell } from "./StudioShell";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { getMealPlanLibraryData } from "@/services/meal-plan-library.service";

export const metadata: Metadata = { title: "Estúdio de Planos | NutriOpus" };

export default async function StudioPage({
  params,
}: {
  params: Promise<{ tenant: string; templateId: string }>;
}) {
  const { tenant, templateId } = await params;
  const { nutritionist } = await requirePermission("mealPlans", "edit", tenant);
  const { t } = await getServerTranslations();

  // Try to find the plan in DB
  const plan = await getMealPlanStudioData(nutritionist.id, templateId);

  if (!plan) {
    const nativeTemplate = nativeMealPlanTemplates.find((template) => template.id === templateId);
    if (!nativeTemplate) notFound();

    return (
      <StudioShell title={t("meal_plan_workshop.title")} subtitle={nativeTemplate.title}>
        <NativeTemplateStudioRedirect
          tenantSlug={tenant}
          templateId={nativeTemplate.id}
          templateTitle={nativeTemplate.title}
        />
      </StudioShell>
    );
  }

  const [patients, customTemplates, library] = await Promise.all([
    prisma.patient.findMany({
      where: { nutritionistId: nutritionist.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.mealPlan.findMany({
      where: { nutritionistId: nutritionist.id, isTemplate: true, id: { not: templateId } },
      include: { meals: { include: { items: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    getMealPlanLibraryData(nutritionist.id),
  ]);

  return (
    <StudioShell title={t("meal_plan_workshop.title")} subtitle={plan.title}>
      <MealPlanStudio
        tenantSlug={tenant}
        plan={plan as ComponentProps<typeof MealPlanStudio>["plan"]}
        patients={patients}
        customTemplates={customTemplates}
        initialLibrary={library}
      />
    </StudioShell>
  );
}
