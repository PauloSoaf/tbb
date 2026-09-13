import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";
import { OficinaPlanosPageClient } from "@/components/ferramentas/OficinaPlanosPageClient";

export async function generateMetadata() {
  return { title: "Oficina de Planos | NutriOpus" };
}

export default async function OficinaPlanosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);

  const [rawTemplates, patients] = await Promise.all([
    prisma.mealPlan.findMany({
      where: { nutritionistId: nutritionist.id, isTemplate: true },
      include: {
        meals: { include: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.patient.findMany({
      where: { nutritionistId: nutritionist.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const customTemplates = rawTemplates.map((plan) => ({
    id: plan.id,
    title: plan.title,
    description: plan.description ?? null,
    objective: plan.objective ?? null,
    totalCalories: plan.totalCalories,
    totalCarbs: plan.totalCarbs ?? 0,
    totalProtein: plan.totalProtein ?? 0,
    totalFat: plan.totalFat ?? 0,
    mealsCount: plan.meals.length,
    itemsCount: plan.meals.reduce((acc, m) => acc + m.items.length, 0),
    updatedAt: plan.updatedAt.toISOString(),
  }));

  return <OficinaPlanosPageClient tenant={tenant} customTemplates={customTemplates} patients={patients} />;
}
