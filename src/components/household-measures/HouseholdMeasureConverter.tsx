"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, Database, Scale } from "lucide-react";
import foods from "@/data/taco.json";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { TacoFoodData } from "@/lib/utils/nutrition";
import {
  calculateNutritionByGrams,
  calculateNutritionFromHouseholdMeasure,
  convertGramsToHouseholdMeasures,
  getMeasureLabel,
  getMeasureName,
  searchHouseholdMeasuresForFood,
  type HouseholdMeasureType,
  type HouseholdMeasureOption,
} from "@/lib/utils/household-measures";

type Mode = "full" | "compact";
type ConversionDirection = "grams-to-measure" | "measure-to-grams";
type MeasureFilter = "ALL" | "SPOONS" | "CUPS_GLASSES" | "LADLES" | "PLATES" | "SLICES" | "UNITS" | "PORTIONS";

const FILTER_TYPES: Record<MeasureFilter, HouseholdMeasureType[] | null> = {
  ALL: null,
  SPOONS: ["SPOON"],
  CUPS_GLASSES: ["CUP", "GLASS"],
  LADLES: ["LADLE"],
  PLATES: ["PLATE"],
  SLICES: ["SLICE"],
  UNITS: ["UNIT", "PIECE"],
  PORTIONS: ["PORTION", "SCOOP", "CUSTOM"],
};

const FILTERS: MeasureFilter[] = ["ALL", "SPOONS", "CUPS_GLASSES", "LADLES", "PLATES", "SLICES", "UNITS", "PORTIONS"];

export function HouseholdMeasureConverter({ mode = "full" }: { mode?: Mode }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState<string>("");
  const [grams, setGrams] = useState("100");
  const [quantity, setQuantity] = useState("1");
  const [selectedMeasureId, setSelectedMeasureId] = useState("");
  const [direction, setDirection] = useState<ConversionDirection>("grams-to-measure");
  const [measureFilter, setMeasureFilter] = useState<MeasureFilter>("ALL");

  const tacoFoods = foods as TacoFoodData[];
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return tacoFoods.slice(0, mode === "compact" ? 5 : 8);
    return tacoFoods.filter((food) => food.description.toLowerCase().includes(normalizedQuery)).slice(0, mode === "compact" ? 8 : 16);
  }, [mode, normalizedQuery, tacoFoods]);

  const selectedFood = useMemo(() => {
    return tacoFoods.find((food) => String(food.id) === selectedFoodId) ?? results[0] ?? null;
  }, [results, selectedFoodId, tacoFoods]);

  const parsedGrams = parsePositiveInput(grams, 100);
  const parsedQuantity = parsePositiveInput(quantity, 1);

  const availableMeasures = useMemo(() => {
    if (!selectedFood) return [];
    return searchHouseholdMeasuresForFood({
      tacoFoodId: selectedFood.id,
      foodName: selectedFood.description,
    });
  }, [selectedFood]);

  const selectedMeasure = useMemo(() => {
    const filtered = filterMeasuresByType(availableMeasures, measureFilter);
    return filtered.find((measure) => measure.measureId === selectedMeasureId) ?? filtered[0] ?? null;
  }, [availableMeasures, measureFilter, selectedMeasureId]);

  const filteredMeasures = useMemo(() => filterMeasuresByType(availableMeasures, measureFilter), [availableMeasures, measureFilter]);

  const gramsConversion = selectedFood
    ? convertGramsToHouseholdMeasures({
        tacoFoodId: selectedFood.id,
        foodName: selectedFood.description,
        grams: parsedGrams,
      })
    : null;
  const filteredSuggestions = gramsConversion
    ? gramsConversion.suggestions.filter((suggestion) => measureMatchesFilter(suggestion, measureFilter))
    : [];

  const nutritionByGrams = selectedFood ? calculateNutritionByGrams(selectedFood, parsedGrams) : null;
  const nutritionByMeasure =
    selectedFood && selectedMeasure
      ? calculateNutritionFromHouseholdMeasure({
          food: selectedFood,
          measure: selectedMeasure,
          quantity: parsedQuantity,
        })
      : null;

  const dense = mode === "compact";
  const cardClass = dense
    ? "space-y-3"
    : "rounded-xl border border-border-neutral bg-card-bg p-4 shadow-sm";

  return (
    <div className={cardClass}>
      <div className={dense ? "space-y-2" : "grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]"}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("household_measures.search_food")}
          </span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedFoodId("");
              setSelectedMeasureId("");
            }}
            placeholder={t("household_measures.search_placeholder")}
            className="w-full rounded-lg border border-border-neutral bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:bg-background"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("household_measures.grams_input")}
          </span>
          <input
            value={grams}
            onChange={(event) => setGrams(event.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-border-neutral bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:bg-background"
          />
        </label>
      </div>

      <div className={dense ? "max-h-52 space-y-2 overflow-y-auto" : "mt-4 grid gap-2 md:grid-cols-2"}>
        {results.map((food) => {
          const active = selectedFood && String(selectedFood.id) === String(food.id);
          return (
            <button
              key={food.id}
              type="button"
              onClick={() => {
                setSelectedFoodId(String(food.id));
                setSelectedMeasureId("");
              }}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-brand-blue bg-brand-blue/10 text-text-primary"
                  : "border-border-neutral bg-white text-text-primary hover:border-brand-blue/50 dark:bg-background"
              }`}
            >
              <span className="block text-sm font-semibold">{food.description}</span>
              <span className="mt-1 block text-xs text-text-secondary">
                {t("household_measures.per_100g", { kcal: food.kcal ?? 0 })}
              </span>
            </button>
          );
        })}
      </div>

      {selectedFood && (
        <>
          <div className="mt-4 space-y-3">
            <SegmentedControl
              value={direction}
              onChange={setDirection}
              options={[
                { value: "grams-to-measure", label: t("household_measures.grams_to_measure") },
                { value: "measure-to-grams", label: t("household_measures.measure_to_grams") },
              ]}
            />
            {availableMeasures.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setMeasureFilter(filter);
                      setSelectedMeasureId("");
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      measureFilter === filter
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-border-neutral bg-white text-text-secondary hover:border-brand-blue/50 dark:bg-background"
                    }`}
                  >
                    {t(`household_measures.filters.${filter.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={dense ? "space-y-3" : "mt-4"}>
            {direction === "grams-to-measure" && (
              <section className="rounded-xl border border-border-neutral bg-white p-3 dark:bg-background">
            <div className="mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-blue" />
              <h2 className="text-sm font-bold text-text-primary">{t("household_measures.grams_to_measure")}</h2>
            </div>
            {filteredSuggestions.length > 0 ? (
              <div className="space-y-2">
                {filteredSuggestions.slice(0, dense ? 3 : 6).map((suggestion) => (
                  <MeasureResult
                    key={`${suggestion.measureId}-${suggestion.grams}`}
                    measure={suggestion}
                    quantity={suggestion.measureQuantity}
                    estimatedGrams={suggestion.estimatedGrams}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <EmptyMeasuresNotice />
            )}
            {nutritionByGrams && <NutritionPreview nutrition={nutritionByGrams} title={t("household_measures.estimated_nutrition")} />}
              </section>
            )}

            {direction === "measure-to-grams" && (
              <section className="rounded-xl border border-border-neutral bg-white p-3 dark:bg-background">
            <div className="mb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-brand-blue" />
              <h2 className="text-sm font-bold text-text-primary">{t("household_measures.measure_to_grams")}</h2>
            </div>

            {filteredMeasures.length > 0 && selectedMeasure ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputMode="decimal"
                    aria-label={t("household_measures.quantity")}
                    className="w-full rounded-lg border border-border-neutral bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:bg-card-bg"
                  />
                  <select
                    value={selectedMeasure.measureId}
                    onChange={(event) => setSelectedMeasureId(event.target.value)}
                    className="w-full rounded-lg border border-border-neutral bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:bg-card-bg"
                  >
                    {filteredMeasures.map((measure) => (
                      <option key={measure.measureId} value={measure.measureId}>
                        {getMeasureLabel(measure, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                {nutritionByMeasure && (
                  <>
                    <div className="rounded-lg bg-surface-warm p-3 text-sm text-text-primary">
                      {t("household_measures.estimated_weight")}:{" "}
                      <strong>{t("household_measures.approx_grams", { grams: nutritionByMeasure.grams })}</strong>
                      <span className="mt-1 block text-xs text-text-secondary">{formatRangeText(selectedMeasure, parsedQuantity, t)}</span>
                    </div>
                    <MeasureMeta measure={selectedMeasure} locale={locale} />
                    <NutritionPreview nutrition={nutritionByMeasure.nutrition} title={t("household_measures.estimated_nutrition")} />
                  </>
                )}
              </div>
            ) : (
              <EmptyMeasuresNotice />
            )}
              </section>
            )}
          </div>
        </>
      )}

      <HouseholdMeasureEstimateNotice />
    </div>
  );
}

function SegmentedControl<TValue extends string>({
  value,
  onChange,
  options,
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: { value: TValue; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-border-neutral bg-surface-warm p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
            value === option.value ? "bg-white text-brand-blue shadow-sm dark:bg-card-bg" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MeasureResult({
  measure,
  quantity,
  estimatedGrams,
  locale,
}: {
  measure: HouseholdMeasureOption;
  quantity: number;
  estimatedGrams: number;
  locale: "pt" | "en" | "es";
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border-neutral bg-card-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {t("household_measures.equivalent_to", {
              quantity,
              measure: getMeasureName(measure.measure, locale),
            })}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("household_measures.approx_grams", { grams: estimatedGrams })}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{formatRangeText(measure, quantity, t)}</p>
        </div>
        <Database className="h-4 w-4 shrink-0 text-text-secondary" />
      </div>
      <MeasureMeta measure={measure} locale={locale} />
    </div>
  );
}

function filterMeasuresByType(measures: HouseholdMeasureOption[], filter: MeasureFilter) {
  return measures.filter((measure) => measureMatchesFilter(measure, filter));
}

function measureMatchesFilter(measure: HouseholdMeasureOption, filter: MeasureFilter) {
  const types = FILTER_TYPES[filter];
  if (!types) return true;
  return types.includes(measure.measure.type);
}

function formatRangeText(measure: HouseholdMeasureOption, quantity: number, t: (key: string, params?: Record<string, string | number>) => string) {
  if (measure.minGrams == null || measure.maxGrams == null) return "";
  const min = Number((measure.minGrams * quantity).toFixed(1));
  const max = Number((measure.maxGrams * quantity).toFixed(1));
  return t("household_measures.approx_range", { min, max });
}

function MeasureMeta({ measure, locale }: { measure: HouseholdMeasureOption; locale: "pt" | "en" | "es" }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
      <span className="rounded-full bg-brand-blue/10 px-2 py-1 font-medium text-brand-blue">
        {t("household_measures.source")}: {measure.sourceName ?? measure.source}
      </span>
      <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
        {t("household_measures.confidence")}: {t(`household_measures.confidence_${measure.confidence.toLowerCase()}`)}
      </span>
      <span className="rounded-full bg-surface-warm px-2 py-1 font-medium text-text-secondary">
        {getMeasureLabel(measure, locale)}
      </span>
    </div>
  );
}

function NutritionPreview({ nutrition, title }: { nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number }; title: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 rounded-lg bg-surface-warm p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <Metric label={t("household_measures.calories")} value={`${nutrition.calories} kcal`} />
        <Metric label={t("household_measures.protein")} value={`${nutrition.protein}g`} />
        <Metric label={t("household_measures.carbs")} value={`${nutrition.carbs}g`} />
        <Metric label={t("household_measures.fat")} value={`${nutrition.fat}g`} />
        <Metric label={t("household_measures.fiber")} value={`${nutrition.fiber}g`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function EmptyMeasuresNotice() {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-dashed border-border-neutral p-4 text-center text-sm text-text-secondary">
      {t("household_measures.no_measures_found")}
    </div>
  );
}

function HouseholdMeasureEstimateNotice() {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{t("household_measures.estimate_title")}</p>
        <p className="mt-1">{t("household_measures.estimate_notice")}</p>
      </div>
    </div>
  );
}

function parsePositiveInput(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
