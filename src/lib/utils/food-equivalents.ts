export type NutritionBasis = {
  calories?: number | string | null;
  protein?: number | string | null;
  carbs?: number | string | null;
  fat?: number | string | null;
  fiber?: number | string | null;
  sodium?: number | string | null;
};

export type FoodPer100g = {
  kcal?: number | string | null;
  calories?: number | string | null;
  protein?: number | string | null;
  carbohydrate?: number | string | null;
  carbs?: number | string | null;
  carbohydrates?: number | string | null;
  CHO?: number | string | null;
  lipid?: number | string | null;
  fat?: number | string | null;
  fiber?: number | string | null;
  sodium?: number | string | null;
};

export function safeNutritionNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  return 0;
}

export function roundNutritionValue(value: unknown): number {
  const safeValue = safeNutritionNumber(value);
  return Math.round(safeValue * 100) / 100;
}

export function calculateNutritionByQuantity(foodPer100g: FoodPer100g, quantityInGrams: number) {
  const quantity = safeNutritionNumber(quantityInGrams);
  const factor = quantity / 100;
  return {
    calories: roundNutritionValue(safeNutritionNumber(foodPer100g.calories ?? foodPer100g.kcal) * factor),
    protein: roundNutritionValue(safeNutritionNumber(foodPer100g.protein) * factor),
    carbs: roundNutritionValue(safeNutritionNumber(foodPer100g.carbs ?? foodPer100g.carbohydrate ?? foodPer100g.carbohydrates ?? foodPer100g.CHO) * factor),
    fat: roundNutritionValue(safeNutritionNumber(foodPer100g.fat ?? foodPer100g.lipid) * factor),
    fiber: roundNutritionValue(safeNutritionNumber(foodPer100g.fiber) * factor),
    sodium: roundNutritionValue(safeNutritionNumber(foodPer100g.sodium) * factor),
  };
}

function calculateEquivalentQuantity(targetValue: unknown, candidateValuePer100g: unknown): number | null {
  const target = safeNutritionNumber(targetValue);
  const candidate = safeNutritionNumber(candidateValuePer100g);
  if (target <= 0 || candidate <= 0) return null;
  return roundNutritionValue((target / candidate) * 100);
}

export function calculateEquivalentByCalories(baseItem: NutritionBasis, candidateFood: FoodPer100g): number | null {
  return calculateEquivalentQuantity(baseItem.calories, candidateFood.calories ?? candidateFood.kcal);
}

export function calculateEquivalentByCarbs(baseItem: NutritionBasis, candidateFood: FoodPer100g): number | null {
  return calculateEquivalentQuantity(baseItem.carbs, candidateFood.carbs ?? candidateFood.carbohydrate ?? candidateFood.carbohydrates ?? candidateFood.CHO);
}

export function calculateEquivalentByProtein(baseItem: NutritionBasis, candidateFood: FoodPer100g): number | null {
  return calculateEquivalentQuantity(baseItem.protein, candidateFood.protein);
}

export function calculateEquivalentByFat(baseItem: NutritionBasis, candidateFood: FoodPer100g): number | null {
  return calculateEquivalentQuantity(baseItem.fat, candidateFood.fat ?? candidateFood.lipid);
}

export function formatEquivalentQuantity(quantity: number | null): string {
  if (quantity === null) return "dados insuficientes";
  const rounded = Math.round(quantity / 5) * 5;
  return `aprox. ${rounded}g`;
}
