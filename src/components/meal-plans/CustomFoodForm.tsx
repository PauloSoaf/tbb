"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMealItemSchema } from "@/validation/meal-plan.schema";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PartialMealItem } from "@/lib/utils/nutrition";
import { AsyncButton } from "@/components/ui/AsyncButton";

import { z } from "zod";

interface CustomFoodFormProps {
  onAdd: (item: PartialMealItem) => void | Promise<void>;
}

export function CustomFoodForm({ onAdd }: CustomFoodFormProps) {
  const { t } = useI18n();

  type FormValues = z.input<typeof createMealItemSchema>;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(createMealItemSchema),
    defaultValues: {
      mealId: "temp", // Ignored on UI, set on server/action
      source: "CUSTOM",
      quantity: 100,
      unit: "g",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  });

  const onSubmit = async (data: FormValues) => {
    await onAdd({
      foodName: data.foodName,
      source: "CUSTOM",
      quantity: data.quantity,
      unit: data.unit,
      householdMeasure: data.householdMeasure,
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      fiber: data.fiber,
      sodium: data.sodium,
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nome do Alimento *
          </label>
          <input
            {...register("foodName")}
            className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Ex: Whey Protein"
            title="Digite o nome do alimento personalizado"
          />
          {errors.foodName && <span className="text-danger text-xs">{errors.foodName.message}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Quant.</label>
            <input
              type="number"
              step="0.1"
              {...register("quantity", { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
              title="Quantidade consumida"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Unidade</label>
            <input
              {...register("unit")}
              className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="g, ml..."
              title="Unidade de medida (ex: gramas, colher)"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Kcal *</label>
          <input
            type="number"
            step="0.1"
            {...register("calories", { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            title="Calorias totais na porção informada"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Carb. (g) *</label>
          <input
            type="number"
            step="0.1"
            {...register("carbs", { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            title="Gramas de carboidrato na porção informada"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Prot. (g) *</label>
          <input
            type="number"
            step="0.1"
            {...register("protein", { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            title="Gramas de proteína na porção informada"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Gord. (g) *</label>
          <input
            type="number"
            step="0.1"
            {...register("fat", { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            title="Gramas de gordura na porção informada"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <AsyncButton
          type="submit"
          pending={isSubmitting}
          pendingLabel={t("common.loading", { defaultValue: "Adicionando..." })}
          className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium"
        >
          {t("mealPlan.add_food")}
        </AsyncButton>
      </div>
    </form>
  );
}
