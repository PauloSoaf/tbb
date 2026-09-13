"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useTransition } from "react";
import { Plus, ArrowLeft, Printer, CheckCircle } from "lucide-react";
import { MealEditor } from "@/components/meal-plans/MealEditor";
import { MealPlanTotalsCard } from "@/components/meal-plans/MealPlanTotalsCard";
import { calculateMealPlanTotals } from "@/lib/utils/nutrition";
import { 
  addMealAction, 
  updateMealAction, 
  deleteMealAction, 
  addMealItemAction,
  deleteMealItemAction,
  activateMealPlanAction,
  saveMealPlanTotalsAction
} from "@/actions/meal-plans.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface MealPlanClientViewProps {
  tenantSlug: string;
  patientId: string;
  plan: any; // We'll bypass strict typing for the root data object here to simplify
}

export function MealPlanClientView({ tenantSlug, patientId, plan }: MealPlanClientViewProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"activate" | "add-meal" | null>(null);
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();

  // Compute live totals
  const currentTotals = calculateMealPlanTotals(plan.meals);

  const handleAddMeal = () => {
    if (pendingAction) return;
    setPendingAction("add-meal");
    startTransition(async () => {
      try {
        const result = await addMealAction(tenantSlug, {
          mealPlanId: plan.id,
          name: `Refeição ${plan.meals.length + 1}`,
          position: plan.meals.length,
        });
        if (result.error) toast.error(result.error);
        else toast.success("Refeição adicionada");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleUpdateMeal = async (mealId: string, updates: any) => {
    // If updates contain items, it's adding or removing items.
    // If it contains name/time/notes, it's updating the meal.
    if ('items' in updates) {
        // Compare with old items to see what was added or removed
        const meal = plan.meals.find((m: any) => m.id === mealId);
        if (updates.items.length > meal.items.length) {
          // Item added
          const newItem = updates.items[updates.items.length - 1];
          const result = await addMealItemAction(tenantSlug, {
            mealId,
            ...newItem,
          });
          if (result.error) toast.error(result.error);
          else {
             toast.success("Alimento adicionado!");
             await saveMealPlanTotalsAction(tenantSlug, plan.id, currentTotals);
          }
        } else if (updates.items.length < meal.items.length) {
          // Item removed
          // Find the missing item
          const oldIds = meal.items.map((i: any) => i.id);
          const newIds = updates.items.map((i: any) => i.id);
          const removedId = oldIds.find((id: string) => !newIds.includes(id));
          if (removedId) {
            const result = await deleteMealItemAction(tenantSlug, removedId);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Alimento removido.");
              await saveMealPlanTotalsAction(tenantSlug, plan.id, currentTotals);
            }
          }
        }
    } else {
      // Updating meal details (name, time, notes)
      const result = await updateMealAction(tenantSlug, mealId, updates);
      if (result.error) toast.error(result.error);
    }
  };

  const handleRemoveMeal = async (mealId: string) => {
    const confirmed = await requestConfirmation({
      title: t("confirmations.remove_meal_with_foods.title"),
      description: t("confirmations.remove_meal_with_foods.description"),
      confirmLabel: t("confirmations.remove_meal_with_foods.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;
    const result = await deleteMealAction(tenantSlug, mealId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Refeição removida");
      await saveMealPlanTotalsAction(tenantSlug, plan.id, currentTotals);
    }
  };

  const handleActivatePlan = () => {
    if (pendingAction) return;
    setPendingAction("activate");
    startTransition(async () => {
      try {
        const result = await activateMealPlanAction(tenantSlug, plan.id);
        if (result.error) toast.error(result.error);
        else toast.success("Plano ativado com sucesso!");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PendingButtonLink
            href={`/dashboard/${tenantSlug}/pacientes/${patientId}/planos`}
            pendingLabel={null}
            className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </PendingButtonLink>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{plan.title}</h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  plan.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                  plan.status === "DRAFT" ? "bg-gray-100 text-gray-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                {plan.status === "ACTIVE" ? "Ativo" : plan.status === "DRAFT" ? "Rascunho" : "Arquivado"}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">Paciente: {plan.patient.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {plan.status !== "ACTIVE" && (
            <AsyncButton
              onClick={handleActivatePlan}
              pending={isPending && pendingAction === "activate"}
              pendingLabel="Ativando..."
              disabled={isPending && pendingAction !== "activate"}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-70"
            >
              <CheckCircle className="w-4 h-4" />
              Ativar Plano
            </AsyncButton>
          )}
          <PendingButtonLink
            href={`/dashboard/${tenantSlug}/pacientes/${patientId}/planos/${plan.id}/pdf`}
            pendingLabel="Abrindo PDF..."
            className="flex items-center gap-2 bg-white border border-border-neutral text-text-primary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <Printer className="w-4 h-4" />
            PDF / Imprimir
          </PendingButtonLink>
        </div>
      </div>

      {/* Totals Summary */}
      <MealPlanTotalsCard totals={currentTotals} />

      {/* Meals Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Refeições</h2>
          <AsyncButton
            onClick={handleAddMeal}
            pending={isPending && pendingAction === "add-meal"}
            pendingLabel="Adicionando..."
            disabled={isPending && pendingAction !== "add-meal"}
            className="flex items-center gap-2 text-brand-blue font-medium hover:text-brand-hover transition-colors text-sm disabled:opacity-70"
          >
            <Plus className="w-4 h-4" />
            Adicionar Refeição
          </AsyncButton>
        </div>

        {plan.meals.length === 0 ? (
          <div className="bg-white border border-border-neutral rounded-xl p-8 text-center text-text-secondary">
            Nenhuma refeição adicionada ainda.
          </div>
        ) : (
          <div className="space-y-6">
            {plan.meals.map((meal: any) => (
              <MealEditor
                key={meal.id}
                meal={meal}
                tenantSlug={tenantSlug}
                mealPlanId={plan.id}
                onUpdate={handleUpdateMeal}
                onRemove={handleRemoveMeal}
              />
            ))}
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
