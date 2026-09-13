import type { TacoFoodData } from "@/lib/utils/nutrition";
import {
  calculateNutritionByGrams,
  calculateNutritionFromHouseholdMeasure,
  convertGramsToHouseholdMeasures,
  convertHouseholdMeasureToGrams,
  searchHouseholdMeasuresForFood,
  suggestBestHouseholdMeasure,
  type HouseholdMeasureOption,
} from "@/lib/utils/household-measures";

export function getHouseholdMeasuresByTacoFoodId(input: { tacoFoodId: string | number }) {
  return searchHouseholdMeasuresForFood({ tacoFoodId: input.tacoFoodId });
}

export function getHouseholdMeasuresByFoodName(input: { foodName: string }) {
  return searchHouseholdMeasuresForFood({ foodName: input.foodName });
}

export function convertFoodGramsToHouseholdMeasures(input: {
  tacoFoodId?: string | number | null;
  foodName: string;
  grams: number;
}) {
  return convertGramsToHouseholdMeasures(input);
}

export function convertFoodHouseholdMeasureToGrams(input: {
  measure: HouseholdMeasureOption;
  quantity: number;
}) {
  return convertHouseholdMeasureToGrams(input);
}

export function calculateFoodNutritionFromHouseholdMeasure(input: {
  food: TacoFoodData;
  measure: HouseholdMeasureOption;
  quantity: number;
}) {
  return calculateNutritionFromHouseholdMeasure(input);
}

export function calculateFoodNutritionByGrams(input: { food: TacoFoodData; grams: number }) {
  return calculateNutritionByGrams(input.food, input.grams);
}

export function suggestBestFoodHouseholdMeasure(input: {
  tacoFoodId?: string | number | null;
  foodName: string;
  grams: number;
}) {
  return suggestBestHouseholdMeasure(input);
}
