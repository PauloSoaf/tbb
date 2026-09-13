import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { createBlankMealPlan } from "@/services/meal-plan.service";
import { prisma } from "@/lib/prisma";
import { MealPlanStudio } from "@/components/meal-plan-studio/MealPlanStudio";

export const metadata: Metadata = { title: "Novo Plano | Estúdio de Planos" };

export default async function NewStudioPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);

  // Create a blank draft immediately so the Studio has a real ID to work with
  const plan = await createBlankMealPlan(nutritionist.id, {
    isTemplate: true,
    title: "Plano sem título",
  });

  // Redirect to the Studio with the new ID — this preserves the URL pattern
  redirect(`/dashboard/${tenant}/ferramentas/oficina-planos/${plan.id}`);
}
