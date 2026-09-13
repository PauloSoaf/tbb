import measures from "../../data/household-measures/common-measures.json";
import mappings from "../../data/household-measures/food-measure-mappings.json";
import { calculateProportionalNutrition, roundNutritionValue, type TacoFoodData } from "./nutrition";

export const HOUSEHOLD_MEASURE_TYPES = [
  "SPOON",
  "CUP",
  "GLASS",
  "LADLE",
  "PLATE",
  "SLICE",
  "UNIT",
  "PIECE",
  "SCOOP",
  "PORTION",
  "CUSTOM",
] as const;

export const HOUSEHOLD_MEASURE_SIZES = [
  "TEA_SPOON",
  "DESSERT_SPOON",
  "TABLE_SPOON",
  "SERVING_SPOON",
  "COFFEE_CUP",
  "TEA_CUP",
  "AMERICAN_GLASS",
  "COMMON_GLASS",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "CUSTOM",
] as const;

export const HOUSEHOLD_MEASURE_SOURCES = [
  "TBCA",
  "TACO",
  "USDA_FDC",
  "ANVISA",
  "PINHEIRO",
  "PACHECO",
  "MANUAL",
  "CURATED",
  "NUTRITIONIST_CUSTOM",
] as const;

export const HOUSEHOLD_MEASURE_CONFIDENCES = ["LOW", "MEDIUM", "HIGH"] as const;

export type HouseholdMeasureType = (typeof HOUSEHOLD_MEASURE_TYPES)[number];
export type HouseholdMeasureSize = (typeof HOUSEHOLD_MEASURE_SIZES)[number];
export type HouseholdMeasureSource = (typeof HOUSEHOLD_MEASURE_SOURCES)[number];
export type HouseholdMeasureConfidence = (typeof HOUSEHOLD_MEASURE_CONFIDENCES)[number];
export type HouseholdLocale = "pt" | "en" | "es";

export type HouseholdMeasureDefinition = {
  id: string;
  key?: string;
  type: HouseholdMeasureType;
  size: HouseholdMeasureSize;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  abbreviationPt?: string;
  abbreviationEn?: string;
  abbreviationEs?: string;
  defaultVolumeMl?: number;
};

export type FoodHouseholdMeasureMapping = {
  foodName: string;
  tacoFoodId: string | null;
  measureId?: string;
  measureKey?: string;
  quantity?: number;
  labelPt: string;
  labelEn?: string;
  labelEs?: string;
  grams: number;
  minGrams?: number;
  maxGrams?: number;
  source: HouseholdMeasureSource;
  sourceName?: string;
  sourceUrl?: string;
  confidence: HouseholdMeasureConfidence;
  isVerified: boolean;
  isDefault?: boolean;
  notes?: string;
  sourceNotes?: string;
};

export type HouseholdMeasureOption = FoodHouseholdMeasureMapping & {
  measure: HouseholdMeasureDefinition;
  normalizedFoodName: string;
};

export type NutritionPreview = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export const HOUSEHOLD_MEASURE_NOTICE_PT =
  "Medidas caseiras sao estimativas. O peso pode variar conforme o alimento, preparo, marca, corte e tamanho do utensilio. Para maior precisao, utilize balanca.";

const measureDefinitions = measures as HouseholdMeasureDefinition[];
const foodMappings = mappings as FoodHouseholdMeasureMapping[];
const FOOD_NAME_STOP_WORDS = new Set(["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "o", "os"]);

function meaningfulFoodNameTokens(value: string) {
  return value.split(" ").filter((token) => token && !FOOD_NAME_STOP_WORDS.has(token));
}

export function normalizeHouseholdFoodName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getMeasureLabel(option: Pick<FoodHouseholdMeasureMapping, "labelPt" | "labelEn" | "labelEs">, locale: HouseholdLocale = "pt") {
  if (locale === "en" && option.labelEn) return option.labelEn;
  if (locale === "es" && option.labelEs) return option.labelEs;
  return option.labelPt;
}

export function getMeasureName(measure: HouseholdMeasureDefinition, locale: HouseholdLocale = "pt") {
  if (locale === "en" && measure.nameEn) return measure.nameEn;
  if (locale === "es" && measure.nameEs) return measure.nameEs;
  return measure.namePt;
}

export function getAllHouseholdMeasures() {
  return measureDefinitions;
}

export function getFoodMeasureMappings() {
  return foodMappings;
}

export function searchHouseholdMeasuresForFood(input: { tacoFoodId?: string | number | null; foodName?: string | null }) {
  const tacoFoodId = input.tacoFoodId == null ? null : String(input.tacoFoodId);
  const normalized = normalizeHouseholdFoodName(input.foodName ?? "");
  const inputTokens = meaningfulFoodNameTokens(normalized);

  return foodMappings
    .filter((mapping) => {
      if (tacoFoodId && mapping.tacoFoodId === tacoFoodId) return true;
      if (!normalized) return false;
      const mappingName = normalizeHouseholdFoodName(mapping.foodName);
      if (mappingName === normalized || mappingName.includes(normalized) || normalized.includes(mappingName)) return true;

      // Native templates often use friendlier names ("Aveia em flocos") than
      // the database ("Aveia, flocos, crua"). Match those names only when at
      // least two meaningful words agree, avoiding broad one-word guesses.
      const mappingTokens = new Set(meaningfulFoodNameTokens(mappingName));
      const matchingTokens = inputTokens.filter((token) => mappingTokens.has(token));
      return matchingTokens.length >= 2 && matchingTokens.length / inputTokens.length >= 0.66;
    })
    .map(toOption)
    .filter((option): option is HouseholdMeasureOption => option !== null)
    .sort(compareHouseholdMeasureOptions);
}

export function convertGramsToHouseholdMeasures(input: { tacoFoodId?: string | number | null; foodName: string; grams: number }) {
  assertPositiveFinite(input.grams, "grams");
  const options = searchHouseholdMeasuresForFood(input);

  return {
    foodName: input.foodName,
    grams: roundNutritionValue(input.grams),
    suggestions: options.map((option) => {
      const gramsPerUnit = option.grams / (option.quantity ?? 1);
      const measureQuantity = roundQuantity(input.grams / gramsPerUnit);
      const estimatedGrams = roundNutritionValue(measureQuantity * gramsPerUnit);
      return {
        ...option,
        measureQuantity,
        gramsPerMeasure: gramsPerUnit,
        estimatedGrams,
      };
    }),
  };
}

export function convertHouseholdMeasureToGrams(input: { measure: HouseholdMeasureOption; quantity: number }) {
  assertPositiveFinite(input.quantity, "quantity");
  assertPositiveFinite(input.measure.grams, "measure.grams");
  return roundNutritionValue(input.quantity * (input.measure.grams / (input.measure.quantity ?? 1)));
}

export function calculateNutritionFromHouseholdMeasure(input: {
  food: TacoFoodData;
  measure: HouseholdMeasureOption;
  quantity: number;
}) {
  const grams = convertHouseholdMeasureToGrams({ measure: input.measure, quantity: input.quantity });
  return {
    grams,
    nutrition: calculateNutritionByGrams(input.food, grams),
  };
}

export function calculateNutritionByGrams(food: TacoFoodData, grams: number): NutritionPreview {
  assertPositiveFinite(grams, "grams");
  return {
    calories: calculateProportionalNutrition(food.kcal, grams),
    protein: calculateProportionalNutrition(food.protein, grams),
    carbs: calculateProportionalNutrition(food.carbohydrate, grams),
    fat: calculateProportionalNutrition(food.lipid, grams),
    fiber: calculateProportionalNutrition(food.fiber, grams),
  };
}

export function suggestBestHouseholdMeasure(input: { tacoFoodId?: string | number | null; foodName: string; grams: number }) {
  const result = convertGramsToHouseholdMeasures(input);
  return result.suggestions
    .slice()
    .sort((a, b) => {
      const aPenalty = Math.abs(a.estimatedGrams - input.grams);
      const bPenalty = Math.abs(b.estimatedGrams - input.grams);
      return aPenalty - bPenalty;
    })[0] ?? null;
}

export function formatHouseholdMeasureSuggestion(
  suggestion: HouseholdMeasureOption & { measureQuantity: number },
  locale: HouseholdLocale = "pt",
) {
  const label = getMeasureLabel(suggestion, locale);
  if (suggestion.measureQuantity === 1) return label;

  const localeTag = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
  const quantity = suggestion.measureQuantity.toLocaleString(localeTag, { maximumFractionDigits: 2 });
  const measureName = label.replace(/^\s*1(?:[.,]0+)?\s*/, "").trim() || getMeasureName(suggestion.measure, locale);
  return `${quantity} × ${measureName}`;
}

function toOption(mapping: FoodHouseholdMeasureMapping): HouseholdMeasureOption | null {
  const measure = measureDefinitions.find((item) => item.id === mapping.measureId || item.key === mapping.measureKey);
  if (!measure) return null;
  return {
    ...mapping,
    measureId: mapping.measureId ?? measure.id,
    quantity: mapping.quantity ?? 1,
    measure,
    normalizedFoodName: normalizeHouseholdFoodName(mapping.foodName),
  };
}

function compareHouseholdMeasureOptions(a: HouseholdMeasureOption, b: HouseholdMeasureOption) {
  if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
  const typeRank = measureTypeRank(a.measure.type) - measureTypeRank(b.measure.type);
  if (typeRank !== 0) return typeRank;
  return a.grams - b.grams;
}

function measureTypeRank(type: HouseholdMeasureType) {
  const order: HouseholdMeasureType[] = ["SPOON", "CUP", "GLASS", "LADLE", "PLATE", "SLICE", "UNIT", "PIECE", "SCOOP", "PORTION", "CUSTOM"];
  return order.indexOf(type);
}

function roundQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 10) return Math.round(value * 4) / 4;
  return Math.round(value * 10) / 10;
}

function assertPositiveFinite(value: number, field: string) {
  if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
    throw new Error(`${field} must be a positive finite number`);
  }
}
