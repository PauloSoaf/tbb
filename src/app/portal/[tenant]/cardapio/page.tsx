import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { calculateMealTotals, type PartialMealItem } from "@/lib/utils/nutrition";
import { Clock } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { getSubstitutionGroupsByMealPlan } from "@/services/meal-substitution.service";
import { PatientSubstitutionOptions } from "@/components/patient-portal/meal-plan/PatientSubstitutionOptions";

interface Props {
  params: Promise<{ tenant: string }>;
}

type MealItemForTotals = {
  foodName: string;
  source: PartialMealItem["source"];
  tacoFoodId: string | null;
  quantity: number;
  unit: string;
  householdMeasure: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
};

function toPartialMealItems(items: MealItemForTotals[]): PartialMealItem[] {
  return items.map((item) => ({
    foodName: item.foodName,
    source: item.source,
    tacoFoodId: item.tacoFoodId ?? undefined,
    quantity: item.quantity,
    unit: item.unit,
    householdMeasure: item.householdMeasure ?? undefined,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber ?? undefined,
    sodium: item.sodium ?? undefined,
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.menu.title", { defaultValue: "Meu Cardápio" }) };
}

export default async function CardapioPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { patient } = await getPortalPatientAction(tenant);
  const activePlan = patient?.mealPlans?.[0] ?? null;
  const { t } = await getServerTranslations();
  const substitutionGroups = activePlan
    ? await getSubstitutionGroupsByMealPlan({
        nutritionistId: session.nutritionistId,
        mealPlanId: activePlan.id,
        visibleOnly: true,
      })
    : [];
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

  // Calculate real totals from items (stored denormalized totals may be stale)
  const planTotals = activePlan
    ? activePlan.meals.reduce(
        (acc, meal) => {
          const mealT = calculateMealTotals(toPartialMealItems(meal.items));
          return {
            calories: acc.calories + mealT.calories,
            protein: acc.protein + mealT.protein,
            carbs: acc.carbs + mealT.carbs,
            fat: acc.fat + mealT.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
    : null;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">{t("patient_portal.menu.title", { defaultValue: "Meu Cardápio" })}</h1>
      {!activePlan ? (
        <div className="mt-8 text-center text-text-secondary">
          <p>{t("patient_portal.menu.no_plan", { defaultValue: "Nenhum plano alimentar ativo no momento." })}</p>
          <p className="text-sm mt-1">{t("patient_portal.menu.wait_nutritionist", { defaultValue: "Aguarde sua nutricionista disponibilizar seu plano." })}</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="bg-white rounded-2xl border border-border-neutral p-4">
            <h2 className="font-semibold text-text-primary">{activePlan.title}</h2>
            {activePlan.description && <p className="text-sm text-text-secondary mt-1">{activePlan.description}</p>}
            {activePlan.objective && (
              <p className="text-sm mt-2 text-brand-blue font-medium">{t("patient_portal.menu.objective", { defaultValue: "Objetivo:" })} {activePlan.objective}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-text-secondary">
              <span>{t("patient_portal.menu.calories", { defaultValue: "Calorias:" })} <strong className="text-amber-600">{planTotals!.calories.toFixed(0)} kcal</strong></span>
              <span>{t("patient_portal.menu.protein", { defaultValue: "Proteína:" })} <strong className="text-emerald-600">{planTotals!.protein.toFixed(1)}g</strong></span>
              <span>{t("patient_portal.menu.carbs", { defaultValue: "Carb:" })} <strong className="text-blue-600">{planTotals!.carbs.toFixed(1)}g</strong></span>
              <span>{t("patient_portal.menu.fat", { defaultValue: "Gordura:" })} <strong className="text-rose-500">{planTotals!.fat.toFixed(1)}g</strong></span>
            </div>
          </div>

          {activePlan.meals.map(meal => {
            const totals = calculateMealTotals(toPartialMealItems(meal.items));
            return (
              <div key={meal.id} className="bg-white rounded-2xl border border-border-neutral overflow-hidden">
                <div className="p-4 bg-warm-beige border-b border-border-neutral flex items-center gap-3">
                  {meal.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meal.imageUrl} alt={meal.name} className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">{meal.name}</h3>
                    {meal.time && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                        <Clock className="w-3 h-3" />
                        {meal.time}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-amber-600">{totals.calories} kcal</span>
                </div>

                {meal.notes && (
                  <div className="px-4 py-2 bg-blue-50/50 border-b border-border-neutral">
                    <p className="text-xs text-text-secondary italic">{meal.notes}</p>
                  </div>
                )}

                {meal.items.length > 0 && (
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border-neutral/50">
                        {meal.items.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 pr-2 font-medium text-text-primary">
                              {item.foodName}
                              <PatientSubstitutionOptions
                                groups={substitutionGroupsByItem.get(item.id) ?? []}
                                labels={substitutionLabels}
                              />
                            </td>
                            <td className="py-2 text-right text-text-secondary whitespace-nowrap align-top">{item.quantity}{item.unit}</td>
                            <td className="py-2 text-right text-xs text-text-secondary whitespace-nowrap align-top">
                              <span className="text-amber-600 font-semibold">{item.calories}</span> kcal
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
