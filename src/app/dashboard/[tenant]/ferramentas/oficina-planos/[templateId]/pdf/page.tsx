import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getMealPlanById } from "@/services/meal-plan.service";
import { getSubstitutionGroupsByMealPlan } from "@/services/meal-substitution.service";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { MealPlanPdfSkeleton } from "@/components/meal-plans/MealPlanPdfSkeleton";
import { PagedMealPlanSheet } from "@/components/meal-plans/PagedMealPlanSheet";
import { PdfPreviewControls } from "@/components/meal-plans/PdfPreviewControls";
import { MealPlanPdfBranding } from "@/components/meal-plans/MealPlanPdfBranding";
import { MealPlanNutritionistSignature } from "@/components/meal-plans/MealPlanNutritionistSignature";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { parseMealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Modelo de Plano Alimentar - PDF" };

export default async function TemplatePrintPage({
  params,
}: {
  params: Promise<{ tenant: string; templateId: string }>;
}) {
  const { tenant, templateId } = await params;

  return (
    <>
      <div className="print:hidden">
        <DashboardHeader
          title="Visualização em PDF"
          subtitle="Modelo de plano alimentar"
          backButton={{ href: `/dashboard/${tenant}/ferramentas/oficina-planos/${templateId}`, label: "Voltar ao editor" }}
        />
      </div>

      {/* Working-area background. On print, this collapses to plain white with no padding. */}
      <div className="min-h-[calc(100vh-2rem)] bg-gray-100 dark:bg-gray-950 py-6 px-4 sm:py-10 print:bg-white print:p-0 print:min-h-0 overflow-x-auto">
        <div className="mx-auto max-w-[820px] print:max-w-none">
          <Suspense
            fallback={
              <div className="bg-white text-text-primary rounded-md shadow-xl ring-1 ring-black/5 p-10">
                <MealPlanPdfSkeleton />
              </div>
            }
          >
            <TemplatePdfContent tenant={tenant} templateId={templateId} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function TemplatePdfContent({ tenant, templateId }: { tenant: string; templateId: string }) {
  const { nutritionist } = await requirePermission("mealPlans", "generatePdf", tenant);

  const plan = await getMealPlanById(nutritionist.id, templateId);
  if (!plan) notFound();

  const { t } = await getServerTranslations();
  const pdfStyle = parseMealPlanPdfStyle(plan.pdfStyle);
  const includeMealImages = pdfStyle.imageMode === "ALL" || pdfStyle.imageMode === "MEALS";
  const includeFoodImages = pdfStyle.imageMode === "ALL";
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const substitutionGroups = await getSubstitutionGroupsByMealPlan({
    nutritionistId: nutritionist.id,
    mealPlanId: plan.id,
    visibleOnly: false,
  });
  const substitutionGroupsByItem = new Map<string, typeof substitutionGroups>();
  for (const group of substitutionGroups) {
    if (!group.baseMealItemId) continue;
    const current = substitutionGroupsByItem.get(group.baseMealItemId) ?? [];
    current.push(group);
    substitutionGroupsByItem.set(group.baseMealItemId, current);
  }

  const totals = plan.meals.reduce(
    (acc, meal) => {
      for (const item of meal.items) {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const headerBlock = (
    <>
      <div className="text-center mb-10 pb-6 border-b-2 border-brand-blue/20">
        <MealPlanPdfBranding
          style={pdfStyle}
          fallbackLogoUrl={nutritionist.profileImageUrl}
          alt={t("meal_plan_clinical.pdf.logo_alt")}
        />
        <h1 className="text-3xl font-bold text-brand-blue mb-2">Modelo de Plano Alimentar</h1>
        <h2 className="text-xl font-semibold mb-4">{plan.title}</h2>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-text-secondary">
          {plan.patient && (
            <p><span className="font-semibold text-text-primary">Paciente:</span> {plan.patient.name}</p>
          )}
          <p><span className="font-semibold text-text-primary">Nutricionista:</span> {nutritionist.name}</p>
          <p><span className="font-semibold text-text-primary">Data:</span> {format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
        {plan.objective && (
          <p className="mt-4 text-sm"><span className="font-semibold">Objetivo:</span> {plan.objective}</p>
        )}

        {totals.calories > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-5 text-sm">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">{Math.round(totals.calories)} kcal</span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{t("meal_substitutions.protein")}: {Math.round(totals.protein)}g</span>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{t("meal_substitutions.carbs")}: {Math.round(totals.carbs)}g</span>
            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-semibold">{t("meal_substitutions.fat")}: {Math.round(totals.fat)}g</span>
          </div>
        )}
      </div>

      {plan.description && (
        <div className="mb-8">
          <h3 className="text-lg font-bold border-b border-border-neutral pb-2 mb-3">Orientações Gerais</h3>
          <p className="text-sm whitespace-pre-wrap">{plan.description}</p>
        </div>
      )}
    </>
  );

  const mealBlocks = plan.meals.map((meal) => {
    const hasItems = meal.items.length > 0;
    const mealKcal = meal.items.reduce((sum, item) => sum + item.calories, 0);
    return {
      key: meal.id,
      node: (
        <div className="break-inside-avoid border border-border-neutral rounded-xl overflow-hidden print:border-none print:shadow-none shadow-sm">
          <div className="bg-brand-blue/5 print:bg-gray-100 p-4 border-b border-border-neutral flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {includeMealImages && meal.showImageInPdf && meal.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={meal.imageUrl} alt={meal.imageAlt || meal.name} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border-neutral" />
              )}
              <h3 className="text-lg font-bold text-brand-blue print:text-black truncate">
                {meal.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {mealKcal > 0 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 print:bg-transparent px-2 py-1 rounded-full">
                  {Math.round(mealKcal)} kcal
                </span>
              )}
              {meal.time && (
                <span className="text-sm font-semibold bg-white print:bg-transparent px-3 py-1 rounded-full border border-border-neutral">
                  {meal.time}
                </span>
              )}
            </div>
          </div>

          {meal.notes && (
            <div className="p-3 bg-gray-50 text-sm italic text-text-secondary border-b border-border-neutral">
              Nota: {meal.notes}
            </div>
          )}

          <div className="p-0">
            {hasItems ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-text-secondary uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Alimento</th>
                    <th className="px-4 py-3 font-semibold text-right w-24">Quant.</th>
                    <th className="px-4 py-3 font-semibold text-right w-32">Medida Caseira</th>
                    <th className="px-4 py-3 font-semibold text-right w-24">Kcal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral">
                  {meal.items.map((item) => {
                    const itemSubstitutions = substitutionGroupsByItem.get(item.id) ?? [];
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          <div className="flex items-start gap-2">
                            {includeFoodImages && item.showImageInPdf && item.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.imageAlt || item.foodName} className="h-8 w-8 shrink-0 rounded object-cover" />
                            )}
                            <span>{item.foodName}</span>
                          </div>
                          {item.imageCaption && includeFoodImages && item.showImageInPdf && (
                            <p className="mt-1 text-[10px] font-normal text-text-secondary">{item.imageCaption}</p>
                          )}
                          {itemSubstitutions.length > 0 && (
                            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs font-normal text-gray-700">
                              <p className="font-semibold">{t("meal_substitutions.allowed_substitutions")}</p>
                              <p className="mb-1 text-[11px] text-gray-500">{t("meal_substitutions.patient_warning")}</p>
                              <ul className="list-disc space-y-1 pl-4">
                                {itemSubstitutions.flatMap((group) => group.items).map((substitute) => (
                                  <li key={substitute.id}>
                                    {substitute.foodName}
                                    {substitute.quantity ? ` - ${substitute.quantity}${substitute.unit ?? ""}` : ""}
                                    {substitute.householdMeasure ? ` (${substitute.householdMeasure})` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}{item.unit}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">{item.householdMeasure || t("meal_plan_clinical.pdf.not_informed")}</td>
                        <td className="px-4 py-3 text-right text-text-secondary">{item.calories || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-sm text-text-secondary text-center">Nenhum alimento cadastrado nesta refeição.</p>
            )}
          </div>
        </div>
      ),
    };
  });

  const footerBlock = (
    <div className="pt-8 border-t border-border-neutral text-center text-sm text-text-secondary">
      <MealPlanNutritionistSignature
        nutritionistName={nutritionist.name}
        crn={nutritionist.crn}
        title={t("meal_plan_clinical.signature.title")}
        professionLabel={t("meal_plan_clinical.signature.nutritionist")}
      />
      <div className="mt-8 border-t border-border-neutral pt-4">
        <p>Este plano alimentar foi gerado por <strong>NutriOpus</strong> - Software para Nutricionistas</p>
        <p className="mt-1">Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>
    </div>
  );

  return (
    <PdfPreviewControls fileName={`Modelo - ${plan.title}`}>
      <PagedMealPlanSheet
        headerBlock={headerBlock}
        mealBlocks={mealBlocks}
        footerBlock={footerBlock}
        pdfStyle={pdfStyle}
        footerContext={{
          pageLabel: t("meal_plan_clinical.pdf.page"),
          ofLabel: t("meal_plan_clinical.pdf.of"),
          generatedAt,
          patientName: plan.patient?.name,
        }}
      />
    </PdfPreviewControls>
  );
}
