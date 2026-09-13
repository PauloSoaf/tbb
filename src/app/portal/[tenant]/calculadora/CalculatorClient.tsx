"use client";

import { useMemo, useState } from "react";
import { Calculator, Search, Utensils } from "lucide-react";
import tacoData from "@/data/taco.json";
import {
  calculateProportionalNutrition,
  getTacoCalories,
  getTacoCarbohydrate,
  getTacoFat,
  parseNutritionNumber,
  type TacoFoodData,
} from "@/lib/utils/nutrition";

const foods = tacoData as TacoFoodData[];

function formatNumber(value: unknown) {
  const numericValue = parseNutritionNumber(value);
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: numericValue >= 100 ? 0 : 1,
  }).format(numericValue);
}

export function CalculatorClient() {
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<TacoFoodData | null>(null);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];

    return foods
      .filter((food) => food.description.toLowerCase().includes(term))
      .slice(0, 12);
  }, [foods, search]);

  const nutrition = selectedFood
    ? {
        calories: calculateProportionalNutrition(getTacoCalories(selectedFood), quantity),
        protein: calculateProportionalNutrition(selectedFood.protein, quantity),
        carbs: calculateProportionalNutrition(getTacoCarbohydrate(selectedFood), quantity),
        fat: calculateProportionalNutrition(getTacoFat(selectedFood), quantity),
        fiber: calculateProportionalNutrition(selectedFood.fiber, quantity),
        sodium: calculateProportionalNutrition(selectedFood.sodium, quantity),
      }
    : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-neutral bg-card-bg p-4 shadow-sm">
        <label className="text-sm font-semibold text-text-primary" htmlFor="food-search">
          Buscar alimento
        </label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            id="food-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex: arroz, banana, frango..."
            className="w-full rounded-xl border border-border-neutral bg-transparent py-3 pl-10 pr-3 text-sm text-text-primary outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-text-primary" htmlFor="food-quantity">
            Quantidade em gramas
          </label>
          <input
            id="food-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="mt-2 w-full rounded-xl border border-border-neutral bg-transparent px-3 py-3 text-sm text-text-primary outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
      </section>

      {selectedFood && nutrition ? (
        <section className="rounded-2xl border border-brand-blue/20 bg-card-bg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Resultado para {quantity}g
              </p>
              <h2 className="mt-1 font-semibold text-text-primary">{selectedFood.description}</h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MacroCard label="Calorias" value={`${formatNumber(nutrition.calories)} kcal`} tone="amber" />
            <MacroCard label="Proteínas" value={`${formatNumber(nutrition.protein)}g`} tone="emerald" />
            <MacroCard label="Carboidratos" value={`${formatNumber(nutrition.carbs)}g`} tone="blue" />
            <MacroCard label="Gorduras" value={`${formatNumber(nutrition.fat)}g`} tone="rose" />
            <MacroCard label="Fibras" value={`${formatNumber(nutrition.fiber)}g`} tone="slate" />
            <MacroCard label="Sódio" value={`${formatNumber(nutrition.sodium)}mg`} tone="slate" />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border-neutral bg-card-bg p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-beige dark:bg-warm-beige/10 text-brand-blue">
            <Utensils className="h-6 w-6" />
          </div>
          <h2 className="mt-3 font-semibold text-text-primary">Escolha um alimento</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Pesquise na TACO e veja uma estimativa nutricional para a quantidade desejada.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-border-neutral bg-card-bg p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Resultados</h2>
          {search.trim().length >= 2 && (
            <span className="text-xs text-text-secondary">{results.length} encontrados</span>
          )}
        </div>

        {search.trim().length < 2 ? (
          <p className="rounded-xl bg-surface-warm p-4 text-sm text-text-secondary">
            Digite pelo menos 2 letras para buscar alimentos.
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-xl bg-surface-warm p-4 text-sm text-text-secondary">
            Nenhum alimento encontrado. Tente outro termo.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => setSelectedFood(food)}
                className={`w-full rounded-xl border p-3 text-left transition-all hover:border-brand-blue hover:bg-brand-blue/5 ${
                  selectedFood?.id === food.id
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-border-neutral bg-card-bg"
                }`}
              >
                <p className="text-sm font-semibold text-text-primary">{food.description}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  100g: {formatNumber(getTacoCalories(food))} kcal | C {formatNumber(getTacoCarbohydrate(food))}g | P{" "}
                  {formatNumber(food.protein)}g | G {formatNumber(getTacoFat(food))}g
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MacroCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "blue" | "emerald" | "rose" | "slate";
}) {
  const tones = {
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
    slate: "bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400",
  };

  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
