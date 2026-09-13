"use client";

import { useMemo, useState } from "react";
import foods from "@/data/taco.json";
import {
  calculateProportionalNutrition,
  getTacoCalories,
  getTacoCarbohydrate,
  getTacoFat,
  parseNutritionNumber,
  type TacoFoodData,
} from "@/lib/utils/nutrition";

type TacoFood = TacoFoodData & {
  id: number;
  description: string;
};

export function MiniTacoSearchTool() {
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState("100");
  const quantity = Math.max(0, Number(grams.replace(",", ".")) || 0);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = foods as TacoFood[];
    if (!normalized) return list.slice(0, 6);
    return list.filter((food) => food.description.toLowerCase().includes(normalized)).slice(0, 10);
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar alimento TACO..."
          className="w-full rounded-lg border border-border-neutral bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
        />
        <input
          value={grams}
          onChange={(event) => setGrams(event.target.value)}
          inputMode="decimal"
          aria-label="Quantidade em gramas"
          className="w-full rounded-lg border border-border-neutral bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>
      <p className="text-[11px] text-text-secondary">Resultados para {quantity || 0}g. A base TACO original e por 100g.</p>

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {results.length === 0 && hasQuery && (
          <p className="py-4 text-center text-xs text-text-secondary">
            Nenhum alimento encontrado para &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
        {results.map((food) => (
          <div key={food.id} className="rounded-lg border border-border-neutral bg-background p-2.5">
            <p className="text-sm font-semibold text-text-primary">{food.description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-medium text-text-secondary">{scale(food.kcal, quantity)} kcal</span>
              <span className="text-xs font-medium text-blue-600">P {scale(food.protein, quantity)}g</span>
              <span className="text-xs font-medium text-amber-600">C {scale(getTacoCarbohydrate(food), quantity)}g</span>
              <span className="text-xs font-medium text-rose-600">G {scale(getTacoFat(food), quantity)}g</span>
            </div>
            <p className="mt-0.5 text-[10px] text-text-secondary opacity-70">
              100g: {getTacoCalories(food)} kcal - P {parseNutritionNumber(food.protein)}g - C {getTacoCarbohydrate(food)}g - G {getTacoFat(food)}g
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function scale(value: unknown, grams: number) {
  const result = calculateProportionalNutrition(value, grams);
  return Number(result.toFixed(result > 20 ? 0 : 1));
}
