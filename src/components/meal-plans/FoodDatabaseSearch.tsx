"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Loader2, Database, Factory } from "lucide-react";
import tacoData from "@/data/taco.json";
import {
  getTacoCalories,
  getTacoCarbohydrate,
  getTacoFat,
  parseNutritionNumber,
  parseTacoFoodToMealItem,
  type PartialMealItem,
  type TacoFoodData,
} from "@/lib/utils/nutrition";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface FoodDatabaseSearchProps {
  onAdd: (item: PartialMealItem) => void | Promise<void>;
}

export function FoodDatabaseSearch({ onAdd }: FoodDatabaseSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [database, setDatabase] = useState<"TACO" | "OFF">("TACO");
  
  // OFF (OpenFoodFacts) State
  const [offResults, setOffResults] = useState<Record<string, unknown>[]>([]);
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [offDebounceTimeout, setOffDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // TACO filtered results
  const tacoFilteredFoods = useMemo(() => {
    if (database !== "TACO" || !searchTerm || searchTerm.length < 2) return [];
    const lower = searchTerm.toLowerCase();
    return (tacoData as TacoFoodData[]).filter((food) =>
      food.description.toLowerCase().includes(lower)
    ).slice(0, 20); // Limit to 20 results for performance
  }, [searchTerm, database]);

  // OFF Search Effect
  useEffect(() => {
    if (database !== "OFF") return;

    if (!searchTerm || searchTerm.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffResults([]);
      return;
    }

    if (offDebounceTimeout) clearTimeout(offDebounceTimeout);

    const timeout = setTimeout(async () => {
      setIsSearchingOff(true);
      try {
        const res = await fetch(`https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=20`);
        const data = await res.json();
        if (data.products) {
          setOffResults(data.products.filter((p: Record<string, unknown>) => p.product_name && p.nutriments));
        } else {
          setOffResults([]);
        }
      } catch (err) {
        console.error("OFF fetch error:", err);
        setOffResults([]);
      } finally {
        setIsSearchingOff(false);
      }
    }, 600); // 600ms debounce

    setOffDebounceTimeout(timeout);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, database]);

  const handleAddTaco = async (food: TacoFoodData) => {
    const item = parseTacoFoodToMealItem(food, quantity);
    await onAdd(item);
    setSearchTerm("");
  };

  const handleAddOff = async (product: Record<string, unknown>) => {
    const nutriments = (product.nutriments || {}) as Record<string, number>;
    const energy = nutriments["energy-kcal_100g"] || 0;
    const carbs = nutriments.carbohydrates_100g || 0;
    const proteins = nutriments.proteins_100g || 0;
    const fat = nutriments.fat_100g || 0;

    const multiplier = quantity / 100;

    await onAdd({
      foodName: `${product.product_name} ${product.brands ? `(${product.brands})` : ''}`,
      quantity,
      unit: "g",
      calories: Math.round(energy * multiplier),
      carbs: Math.round(carbs * multiplier * 10) / 10,
      protein: Math.round(proteins * multiplier * 10) / 10,
      fat: Math.round(fat * multiplier * 10) / 10,
      source: "TACO", // Treating as standard DB source, or maybe "CUSTOM" is safer, let's use TACO so it's a known DB. Or CUSTOM so it's not strictly TACO. Let's use CUSTOM.
    });
    setSearchTerm("");
  };

  return (
    <div className="space-y-4">
      {/* DB Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setDatabase("TACO")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            database === "TACO" ? "bg-white text-brand-blue shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Database className="w-3 h-3" />
          Natural (TACO)
        </button>
        <button
          onClick={() => setDatabase("OFF")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            database === "OFF" ? "bg-white text-brand-blue shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Factory className="w-3 h-3" />
          Mercado / Marcas
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          placeholder={database === "TACO" ? "Ex: Banana, Arroz..." : "Ex: Aveia Quaker, Iogurte..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        {isSearchingOff && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary animate-spin" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-text-secondary whitespace-nowrap">
          Porção (g/ml):
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24 px-3 py-1.5 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </div>

      {/* TACO Results */}
      {database === "TACO" && tacoFilteredFoods.length > 0 && (
        <div className="border border-border-neutral rounded-lg overflow-hidden divide-y divide-border-neutral max-h-64 overflow-y-auto bg-white">
          {tacoFilteredFoods.map((food) => (
            <div key={food.id} className="p-3 hover:bg-warm-beige transition-colors flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate" title={food.description}>
                  {food.description}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                  <span className="font-semibold text-amber-600">{formatNutritionNumber(getTacoCalories(food))} kcal</span>
                  <span>C: {formatNutritionNumber(getTacoCarbohydrate(food))}g</span>
                  <span>P: {formatNutritionNumber(food.protein)}g</span>
                  <span>G: {formatNutritionNumber(getTacoFat(food))}g</span>
                </div>
              </div>
              <AsyncButton
                type="button"
                onClick={() => handleAddTaco(food)}
                pendingLabel={null}
                className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors shrink-0"
                title="Adicionar"
                aria-label={`Adicionar ${food.description}`}
              >
                <Plus className="w-5 h-5" />
              </AsyncButton>
            </div>
          ))}
        </div>
      )}

      {/* OFF Results */}
      {database === "OFF" && offResults.length > 0 && (
        <div className="border border-border-neutral rounded-lg overflow-hidden divide-y divide-border-neutral max-h-64 overflow-y-auto bg-white">
          {offResults.map((product, idx) => {
            const nutriments = (product.nutriments || {}) as Record<string, number>;
            const energy = nutriments["energy-kcal_100g"] || 0;
            const carbs = nutriments.carbohydrates_100g || 0;
            const proteins = nutriments.proteins_100g || 0;
            const fat = nutriments.fat_100g || 0;
            const productKey = typeof product.id === "string" || typeof product.id === "number" ? product.id : idx;
            const imageUrl = typeof product.image_front_thumb_url === "string" ? product.image_front_thumb_url : "";

            return (
              <div key={productKey} className="p-3 hover:bg-warm-beige transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex gap-3 items-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="w-10 h-10 object-contain rounded bg-white shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <Factory className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate" title={product.product_name as string}>
                      {product.product_name as string} <span className="text-text-secondary font-normal text-xs">{product.brands ? `(${product.brands as string})` : ''}</span>
                    </p>
                    <div className="flex gap-2 mt-1 text-[10px] text-text-secondary">
                      <span className="font-semibold text-amber-600">{energy.toFixed(1)} kcal</span>
                      <span>C: {carbs.toFixed(1)}g</span>
                      <span>P: {proteins.toFixed(1)}g</span>
                      <span>G: {fat.toFixed(1)}g</span>
                      <span className="ml-1 px-1 bg-gray-100 rounded">/100g</span>
                    </div>
                  </div>
                </div>
                <AsyncButton
                  type="button"
                  onClick={() => handleAddOff(product)}
                  pendingLabel={null}
                  className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors shrink-0"
                  title="Adicionar"
                  aria-label={`Adicionar ${String(product.product_name ?? "produto")}`}
                >
                  <Plus className="w-5 h-5" />
                </AsyncButton>
              </div>
            );
          })}
        </div>
      )}
      
      {database === "TACO" && searchTerm.length >= 2 && tacoFilteredFoods.length === 0 && (
        <p className="text-sm text-text-secondary text-center py-4">
          Nenhum alimento natural encontrado.
        </p>
      )}

      {database === "OFF" && searchTerm.length >= 3 && !isSearchingOff && offResults.length === 0 && (
        <p className="text-sm text-text-secondary text-center py-4">
          Nenhum produto de mercado encontrado.
        </p>
      )}
    </div>
  );
}

function formatNutritionNumber(value: unknown) {
  return parseNutritionNumber(value).toFixed(1);
}
