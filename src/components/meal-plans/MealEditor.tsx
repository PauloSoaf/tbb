"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Clock, Info, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PartialMealItem, calculateMealTotals } from "@/lib/utils/nutrition";
import { MealItemRow } from "./MealItemRow";
import { FoodDatabaseSearch } from "./FoodDatabaseSearch";
import { CustomFoodForm } from "./CustomFoodForm";
import { SubstitutionGroupDrawer } from "@/components/meal-substitutions/SubstitutionGroupDrawer";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface MealEditorProps {
  meal: {
    id: string;
    name: string;
    time: string | null;
    notes: string | null;
    imageUrl?: string | null;
    items: PartialMealItem[];
  };
  tenantSlug?: string;
  mealPlanId?: string;
  onUpdate: (mealId: string, updates: Partial<MealEditorProps["meal"]>) => void | Promise<void>;
  onRemove: (mealId: string) => void | Promise<void>;
}

export function MealEditor({ meal, tenantSlug, mealPlanId, onUpdate, onRemove }: MealEditorProps) {
  const { t } = useI18n();
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [foodSource, setFoodSource] = useState<"TACO" | "CUSTOM">("TACO");
  const [localName, setLocalName] = useState(meal.name);
  const [localTime, setLocalTime] = useState(meal.time || "");
  const [localNotes, setLocalNotes] = useState(meal.notes || "");
  const [localImageUrl, setLocalImageUrl] = useState(meal.imageUrl || "");
  const pendingOperationsRef = useRef(new Set<string>());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  const totals = calculateMealTotals(meal.items);

  const runOperation = async (key: string, operation: () => void | Promise<void>) => {
    if (pendingOperationsRef.current.has(key)) return;
    pendingOperationsRef.current.add(key);
    setPendingOperations(new Set(pendingOperationsRef.current));
    try {
      await operation();
    } finally {
      pendingOperationsRef.current.delete(key);
      setPendingOperations(new Set(pendingOperationsRef.current));
    }
  };

  const handleAddFood = async (item: PartialMealItem) => {
    await runOperation("food:add", () => onUpdate(meal.id, {
      items: [...meal.items, item],
    }));
    setIsAddingFood(false);
  };

  const handleRemoveItem = async (index: number) => {
    const newItems = [...meal.items];
    newItems.splice(index, 1);
    await runOperation(`food:remove:${index}`, () => onUpdate(meal.id, { items: newItems }));
  };

  return (
    <div className="bg-white border border-border-neutral rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-warm-beige p-4 flex items-center justify-between border-b border-border-neutral">
        <div className="flex-1">
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => { if (localName !== meal.name) void runOperation("field:name", () => onUpdate(meal.id, { name: localName })) }}
            className="text-lg font-semibold text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
            placeholder="Nome da refeição"
          />
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4 text-text-secondary" />
            <input
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              onBlur={() => { if (localTime !== (meal.time || "")) void runOperation("field:time", () => onUpdate(meal.id, { time: localTime })) }}
              className="text-sm text-text-secondary bg-transparent border-none focus:outline-none p-0"
              title="Horário da refeição"
            />
          </div>
          {[...pendingOperations].some((key) => key.startsWith("field:")) && (
            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-blue" role="status" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Salvando alterações...
            </span>
          )}
        </div>
        <AsyncButton
          onClick={() => runOperation("meal:remove", () => onRemove(meal.id))}
          pending={pendingOperations.has("meal:remove")}
          pendingLabel={null}
          className="p-2 text-text-secondary hover:text-danger hover:bg-white rounded-lg transition-colors ml-4"
          title="Remover refeição"
          aria-label="Remover refeição"
        >
          <Trash2 className="w-5 h-5" />
        </AsyncButton>
      </div>

      {/* Notes & Image URL */}
      <div className="p-3 border-b border-border-neutral bg-gray-50/50 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
          <input
            type="text"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => { if (localNotes !== (meal.notes || "")) void runOperation("field:notes", () => onUpdate(meal.id, { notes: localNotes })) }}
            className="text-sm text-text-secondary bg-transparent border-none focus:outline-none w-full placeholder:text-gray-400"
            placeholder="Observações da refeição (ex: Opção 2...)"
            title="Observações adicionais"
          />
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-semibold text-text-secondary mt-1">Img:</span>
          <input
            type="text"
            value={localImageUrl}
            onChange={(e) => setLocalImageUrl(e.target.value)}
            onBlur={() => { if (localImageUrl !== (meal.imageUrl || "")) void runOperation("field:image", () => onUpdate(meal.id, { imageUrl: localImageUrl })) }}
            className="text-sm text-text-secondary bg-transparent border-none focus:outline-none w-full placeholder:text-gray-400"
            placeholder="URL da imagem (opcional)"
            title="Adicione a URL de uma imagem para ilustrar a refeição"
          />
        </div>
        {localImageUrl && (
           // eslint-disable-next-line @next/next/no-img-element
           <img src={localImageUrl} alt="Meal preview" className="w-16 h-16 object-cover rounded-md mt-1 border border-border-neutral" />
        )}
      </div>

      {/* Items List */}
      <div className="p-4">
        {meal.items.length > 0 ? (
          <div className="mb-4">
            {meal.items.map((item, index) => (
              <div key={`${item.foodName}-${index}`} className="space-y-2">
                <MealItemRow
                  item={item}
                  onRemove={() => handleRemoveItem(index)}
                />
                {tenantSlug && mealPlanId && "id" in item && typeof item.id === "string" && (
                  <div className="pl-2">
                    <SubstitutionGroupDrawer
                      tenantSlug={tenantSlug}
                      mealPlanId={mealPlanId}
                      mealId={meal.id}
                      mealItem={{
                        id: item.id,
                        foodName: item.foodName,
                        quantity: item.quantity,
                        unit: item.unit,
                        householdMeasure: item.householdMeasure,
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-4 mb-4">
            Nenhum alimento adicionado.
          </p>
        )}

        {/* Add Food Section */}
        {isAddingFood ? (
          <div className="border border-brand-blue/30 rounded-lg p-4 bg-brand-blue/5">
            <div className="flex gap-2 mb-4 border-b border-border-neutral pb-2">
              <button
                className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${foodSource === "TACO" ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige"}`}
                onClick={() => setFoodSource("TACO")}
              >
                {t("mealPlan.taco_food")}
              </button>
              <button
                className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${foodSource === "CUSTOM" ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige"}`}
                onClick={() => setFoodSource("CUSTOM")}
              >
                {t("mealPlan.custom_food")}
              </button>
            </div>

            {foodSource === "TACO" ? (
              <FoodDatabaseSearch onAdd={handleAddFood} />
            ) : (
              <CustomFoodForm onAdd={handleAddFood} />
            )}

            <div className="mt-4 flex justify-end border-t border-border-neutral pt-3">
              <button
                onClick={() => setIsAddingFood(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingFood(true)}
            className="flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-brand-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("mealPlan.add_food")}
          </button>
        )}
      </div>

      {/* Footer Totals */}
      <div className="bg-gray-50 p-4 border-t border-border-neutral flex flex-wrap gap-4 text-sm">
        <div className="flex-1 min-w-[100px]">
          <p className="text-text-secondary text-xs uppercase font-semibold">Kcal</p>
          <p className="font-bold text-text-primary">{totals.calories}</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-text-secondary text-xs uppercase font-semibold">Carb</p>
          <p className="font-bold text-text-primary">{totals.carbs}g</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-text-secondary text-xs uppercase font-semibold">Prot</p>
          <p className="font-bold text-text-primary">{totals.protein}g</p>
        </div>
        <div className="flex-1 min-w-[100px]">
          <p className="text-text-secondary text-xs uppercase font-semibold">Gord</p>
          <p className="font-bold text-text-primary">{totals.fat}g</p>
        </div>
      </div>
    </div>
  );
}
