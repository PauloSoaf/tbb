"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import tacoData from "@/data/taco.json";
import {
  calculateEquivalentByCalories,
  calculateEquivalentByCarbs,
  calculateEquivalentByFat,
  calculateEquivalentByProtein,
  calculateNutritionByQuantity,
} from "@/lib/utils/food-equivalents";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { EquivalentPortionPreview } from "./EquivalentPortionPreview";
import type { SubstitutionBaseItem, SubstitutionBasis } from "./types";

type TacoFood = {
  id: string | number;
  description: string;
  kcal?: number;
  protein?: number;
  carbohydrate?: number;
  lipid?: number;
  fiber?: number;
  sodium?: number;
};

function suggestQuantity(baseItem: SubstitutionBaseItem, food: TacoFood, basis: SubstitutionBasis) {
  switch (basis) {
    case "CALORIES":
      return calculateEquivalentByCalories(baseItem, food);
    case "CARBS":
      return calculateEquivalentByCarbs(baseItem, food);
    case "PROTEIN":
      return calculateEquivalentByProtein(baseItem, food);
    case "FAT":
      return calculateEquivalentByFat(baseItem, food);
    default:
      return null;
  }
}

export function EquivalentFoodSearch({
  baseItem,
  basis,
  onAdd,
  disabled = false,
}: {
  baseItem: SubstitutionBaseItem;
  basis: SubstitutionBasis;
  onAdd: (item: {
    foodName: string;
    source: "TACO";
    tacoFoodId: string;
    quantity?: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    equivalenceNotes?: string;
  }) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return (tacoData as TacoFood[])
      .filter((food) => food.description.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [query]);

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("meal_substitutions.search_taco_placeholder")}
          className="w-full rounded-xl border border-border-neutral bg-card-bg py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
      </label>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {results.map((food) => {
          const suggestedQuantity = suggestQuantity(baseItem, food, basis);
          const quantity = suggestedQuantity ?? 100;
          const nutrition = calculateNutritionByQuantity(food, quantity);
          return (
            <div key={food.id} className="rounded-xl border border-border-neutral bg-card-bg p-3 transition-colors hover:border-brand-blue/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{food.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span>{food.kcal ?? 0} kcal/100g</span>
                    <EquivalentPortionPreview quantityInGrams={suggestedQuantity} />
                  </div>
                </div>
                <AsyncButton
                  type="button"
                  onClick={() => onAdd({
                    foodName: food.description,
                    source: "TACO",
                    tacoFoodId: String(food.id),
                    quantity,
                    unit: "g",
                    ...nutrition,
                    equivalenceNotes: suggestedQuantity === null ? t("meal_substitutions.manual_estimate") : undefined,
                  })}
                  disabled={disabled}
                  pendingLabel={null}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white transition-all hover:-translate-y-0.5 hover:bg-brand-blue-hover hover:shadow-md"
                  aria-label={t("meal_substitutions.add_substitute")}
                >
                  <Plus className="h-4 w-4" />
                </AsyncButton>
              </div>
            </div>
          );
        })}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="rounded-xl border border-dashed border-border-neutral p-4 text-center text-sm text-text-secondary">
            {t("meal_substitutions.no_taco_results")}
          </p>
        )}
      </div>
    </div>
  );
}
