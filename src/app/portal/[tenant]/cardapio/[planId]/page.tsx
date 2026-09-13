import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateMealTotals } from "@/lib/utils/nutrition";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Clock, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { getSubstitutionGroupsByMealPlan } from "@/services/meal-substitution.service";
import { PatientSubstitutionOptions } from "@/components/patient-portal/meal-plan/PatientSubstitutionOptions";

interface Props {
  params: Promise<{ tenant: string; planId: string }>;
}

export default async function PortalPlanDetailPage({ params }: Props) {
  const { tenant, planId } = await params;
  const ps = await getPatientSessionFromCookies();
  if (!ps || ps.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, patientId: ps.patientId },
    include: {
      meals: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!plan) notFound();

  const { t } = await getServerTranslations();
  const substitutionGroups = await getSubstitutionGroupsByMealPlan({
    nutritionistId: ps.nutritionistId,
    mealPlanId: plan.id,
    visibleOnly: true,
  });
  const substitutionGroupsByItem = new Map<string, typeof substitutionGroups>();
  for (const group of substitutionGroups) {
    if (!group.baseMealItemId) continue;
    const current = substitutionGroupsByItem.get(group.baseMealItemId) ?? [];
    current.push(group);
    substitutionGroupsByItem.set(group.baseMealItemId, current);
  }
  const substitutionLabels = {
    viewOptions: t("meal_substitutions.view_options"),
    optionsAvailable: t("meal_substitutions.options_available", { count: "{{count}}" }),
    patientWarning: t("meal_substitutions.patient_warning"),
    calories: t("meal_substitutions.calories"),
    protein: t("meal_substitutions.protein"),
    carbs: t("meal_substitutions.carbs"),
    fat: t("meal_substitutions.fat"),
  };

  const allItems = plan.meals.flatMap((m) => m.items);
  const totals = calculateMealTotals(
    allItems.map((i) => ({
      foodName: i.foodName,
      source: i.source,
      quantity: i.quantity,
      unit: i.unit,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
    }))
  );

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <Link
        href={`/portal/${tenant}/cardapio`}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao cardápio
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">{plan.title}</h1>
        {plan.objective && <p className="text-sm text-text-secondary mt-1">{plan.objective}</p>}
        <p className="text-xs text-text-secondary mt-1">
          Criado em {format(new Date(plan.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Flame, label: "Calorias", value: `${totals.calories} kcal`, color: "text-orange-500 bg-orange-50" },
          { icon: Beef, label: "Proteína", value: `${totals.protein}g`, color: "text-red-500 bg-red-50" },
          { icon: Wheat, label: "Carbs", value: `${totals.carbs}g`, color: "text-amber-500 bg-amber-50" },
          { icon: Droplets, label: "Gordura", value: `${totals.fat}g`, color: "text-blue-500 bg-blue-50" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`rounded-xl p-3 ${color} text-center`}>
            <Icon className="w-4 h-4 mx-auto mb-1" />
            <p className="text-xs opacity-70">{label}</p>
            <p className="text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>

      {plan.description && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-900 mb-1">Orientações gerais</p>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{plan.description}</p>
        </div>
      )}

      {/* Meals */}
      <div className="space-y-4">
        {plan.meals.map((meal) => {
          const mealTotals = calculateMealTotals(
            meal.items.map((i) => ({
              foodName: i.foodName,
              source: i.source,
              quantity: i.quantity,
              unit: i.unit,
              calories: i.calories,
              protein: i.protein,
              carbs: i.carbs,
              fat: i.fat,
            }))
          );
          return (
            <div key={meal.id} className="bg-white border border-border-neutral rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-border-neutral bg-gray-50">
                <div className="flex items-center gap-3">
                  {meal.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meal.imageUrl} alt={meal.name} className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-text-primary">{meal.name}</h3>
                    {meal.time && (
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        {meal.time}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  {mealTotals.calories} kcal
                </span>
              </div>
              {meal.notes && (
                <p className="px-4 py-2 text-xs italic text-text-secondary border-b border-border-neutral">
                  {meal.notes}
                </p>
              )}
              <div className="divide-y divide-border-neutral/50">
                {meal.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.foodName}</p>
                      {item.householdMeasure && (
                        <p className="text-xs text-text-secondary">{item.householdMeasure}</p>
                      )}
                      <PatientSubstitutionOptions
                        groups={substitutionGroupsByItem.get(item.id) ?? []}
                        labels={substitutionLabels}
                      />
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold text-text-primary">
                        {item.quantity}{item.unit}
                      </p>
                      <p className="text-xs text-text-secondary">{item.calories} kcal</p>
                    </div>
                  </div>
                ))}
                {meal.items.length === 0 && (
                  <p className="px-4 py-3 text-sm text-text-secondary">Nenhum alimento nesta refeição.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
