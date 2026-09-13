"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, Search, Star } from "lucide-react";
import tacoData from "@/data/taco.json";
import { HouseholdMeasureConverter } from "@/components/household-measures/HouseholdMeasureConverter";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function TacoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState<string>("100");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("taco-favorites");
    Promise.resolve().then(() => {
      if (stored) setFavorites(JSON.parse(stored));
      setMounted(true);
    });
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((favoriteId) => favoriteId !== id) : [...prev, id];
      localStorage.setItem("taco-favorites", JSON.stringify(next));
      return next;
    });
  };

  const filteredFoods = useMemo(() => {
    if (!search.trim()) {
      const favs = tacoData.filter((food) => favorites.includes(food.id.toString()));
      const common = tacoData.filter((food) =>
        [
          "Arroz, branco, cozido",
          "Feijao, carioca, cozido",
          "Frango, peito, sem pele, cozido",
          "Ovo, de galinha, cozido",
          "Banana, prata, crua",
        ].includes(food.description)
      );
      const combined = [...favs, ...common];
      return Array.from(new Set(combined.map((food) => food.id))).map((id) => combined.find((food) => food.id === id)!);
    }

    const query = search.toLowerCase();
    return tacoData.filter((food) => food.description.toLowerCase().includes(query)).slice(0, 50);
  }, [search, favorites]);

  const multiplier = (parseFloat(amount) || 0) / 100;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div>
        <Link
          href={`/dashboard/${tenant}/ferramentas`}
          className="mb-2 inline-flex items-center text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("taco.back_to_tools")}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Database className="h-6 w-6 text-brand-blue" />
          {t("taco.title")}
        </h1>
        <p className="mt-1 text-text-secondary">{t("taco.subtitle")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-border-neutral bg-card-bg p-4 shadow-sm md:flex-row">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("taco.search_placeholder")}
            className="w-full rounded-lg border border-border-neutral bg-gray-50 py-3 pl-10 pr-4 text-text-primary transition-all focus:border-brand-blue focus:ring-1 dark:bg-card-bg dark:text-slate-200"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="text-sm font-medium text-text-secondary">{t("taco.portion_grams")}</label>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-24 rounded-lg border border-border-neutral bg-gray-50 px-3 py-2 text-center text-text-primary focus:border-brand-blue focus:ring-1 dark:bg-card-bg dark:text-slate-200"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-neutral bg-card-bg shadow-sm">
        {filteredFoods.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            {search.trim() ? t("taco.no_food_found") : t("taco.type_to_search")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-neutral bg-gray-50 dark:bg-card-bg">
                  <th className="w-10 p-4"></th>
                  <th className="p-4 font-semibold text-text-primary dark:text-slate-200">{t("taco.food")}</th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-slate-200">{t("taco.kcal")}</th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-slate-200">{t("taco.carbs")}</th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-slate-200">{t("taco.protein")}</th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-slate-200">{t("taco.fat")}</th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-slate-200">{t("taco.fiber")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral">
                {filteredFoods.map((food) => {
                  const isFav = favorites.includes(food.id.toString());
                  return (
                    <tr key={food.id} className="transition-colors hover:bg-warm-beige/50">
                      <td className="p-4 text-center">
                        {mounted && (
                          <button
                            type="button"
                            aria-label={t("taco.toggle_favorite")}
                            onClick={() => toggleFavorite(food.id.toString())}
                            className="text-text-secondary transition-colors hover:text-yellow-500"
                          >
                            <Star className={`h-5 w-5 ${isFav ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </button>
                        )}
                      </td>
                      <td className="p-4 font-medium text-text-primary dark:text-slate-200">{food.description}</td>
                      <td className="p-4 text-right text-text-secondary">{(food.kcal * multiplier).toFixed(1)}</td>
                      <td className="p-4 text-right text-text-secondary">{(food.carbohydrate * multiplier).toFixed(1)}</td>
                      <td className="p-4 text-right text-text-secondary">{(food.protein * multiplier).toFixed(1)}</td>
                      <td className="p-4 text-right text-text-secondary">{(food.lipid * multiplier).toFixed(1)}</td>
                      <td className="p-4 text-right text-text-secondary">{(food.fiber * multiplier).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">{t("household_measures.title")}</h2>
          <p className="text-sm text-text-secondary">{t("household_measures.subtitle")}</p>
        </div>
        <HouseholdMeasureConverter />
      </section>
    </div>
  );
}
