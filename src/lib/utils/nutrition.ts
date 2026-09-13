/**
 * Rounds a nutritional value to a maximum of 2 decimal places.
 * Returns 0 if the value is NaN or negative.
 */
export function parseNutritionNumber(value: unknown): number {
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
  const safeValue = parseNutritionNumber(value);
  if (safeValue === 0) return 0;
  return Math.round(safeValue * 100) / 100;
}

/**
 * Calculates proportional nutrition based on a 100g reference.
 * Formula: (value per 100g * quantity) / 100
 */
export function calculateProportionalNutrition(valuePer100g: unknown, quantity: number): number {
  const safeValue = roundNutritionValue(valuePer100g);
  const safeQuantity = parseNutritionNumber(quantity);
  return roundNutritionValue((safeValue * safeQuantity) / 100);
}

export interface TacoFoodData {
  id: string | number;
  description: string;
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
}

export interface PartialMealItem {
  foodName: string;
  source: "TACO" | "CUSTOM";
  tacoFoodId?: string;
  quantity: number;
  unit: string;
  householdMeasure?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export function getTacoCalories(tacoFood: TacoFoodData): number {
  return parseNutritionNumber(tacoFood.calories ?? tacoFood.kcal);
}

export function getTacoCarbohydrate(tacoFood: TacoFoodData): number {
  return parseNutritionNumber(tacoFood.carbohydrate ?? tacoFood.carbs ?? tacoFood.carbohydrates ?? tacoFood.CHO);
}

export function getTacoFat(tacoFood: TacoFoodData): number {
  return parseNutritionNumber(tacoFood.lipid ?? tacoFood.fat);
}

/**
 * Parses a TACO food item into a MealItem schema format given a quantity (in grams).
 */
export function parseTacoFoodToMealItem(tacoFood: TacoFoodData, quantityInGrams: number = 100): PartialMealItem {
  return {
    foodName: tacoFood.description,
    source: "TACO",
    tacoFoodId: String(tacoFood.id),
    quantity: quantityInGrams,
    unit: "g",
    calories: calculateProportionalNutrition(getTacoCalories(tacoFood), quantityInGrams),
    protein: calculateProportionalNutrition(tacoFood.protein, quantityInGrams),
    carbs: calculateProportionalNutrition(getTacoCarbohydrate(tacoFood), quantityInGrams),
    fat: calculateProportionalNutrition(getTacoFat(tacoFood), quantityInGrams),
    fiber: calculateProportionalNutrition(tacoFood.fiber, quantityInGrams),
    sodium: calculateProportionalNutrition(tacoFood.sodium, quantityInGrams),
  };
}

export interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Calculates the totals for a single meal by summing up all its items.
 */
export function calculateMealTotals(items: PartialMealItem[]): MealTotals {
  return items.reduce(
    (acc, item) => ({
      calories: roundNutritionValue(acc.calories + (item.calories || 0)),
      protein: roundNutritionValue(acc.protein + (item.protein || 0)),
      carbs: roundNutritionValue(acc.carbs + (item.carbs || 0)),
      fat: roundNutritionValue(acc.fat + (item.fat || 0)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculates the grand totals for an entire meal plan by summing up all its meals.
 */
export function calculateMealPlanTotals(meals: { items: PartialMealItem[] }[]): MealTotals {
  return meals.reduce(
    (acc, meal) => {
      const mealTotals = calculateMealTotals(meal.items);
      return {
        calories: roundNutritionValue(acc.calories + mealTotals.calories),
        protein: roundNutritionValue(acc.protein + mealTotals.protein),
        carbs: roundNutritionValue(acc.carbs + mealTotals.carbs),
        fat: roundNutritionValue(acc.fat + mealTotals.fat),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
