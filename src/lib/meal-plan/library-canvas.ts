import type {
  MealPlanLibraryDragPayload,
  SavedMealPlanLibraryFood,
  SavedMealPlanLibraryMeal,
} from "./library-types";

export const MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE = "application/x-nutriopus-library-food";
export const MEAL_PLAN_LIBRARY_MEAL_DRAG_TYPE = "application/x-nutriopus-library-meal";

function canvasId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `temp-library-${prefix}-${random}`;
}

export function savedFoodToCanvasItem(food: SavedMealPlanLibraryFood, position = 0) {
  const snapshot: Partial<SavedMealPlanLibraryFood> = { ...food };
  delete snapshot.id;
  delete snapshot.timesUsed;
  delete snapshot.updatedAt;
  return {
    ...snapshot,
    id: canvasId("food"),
    position,
  };
}

export function savedMealToCanvasNode(meal: SavedMealPlanLibraryMeal) {
  const snapshot: Partial<SavedMealPlanLibraryMeal> = { ...meal };
  delete snapshot.id;
  delete snapshot.timesUsed;
  delete snapshot.updatedAt;
  delete snapshot.items;
  return {
    type: "meal",
    attrs: {
      ...snapshot,
      id: canvasId("meal"),
      items: meal.items.map((item, index) => {
        const food = { ...item };
        delete food.position;
        return {
          ...food,
          id: canvasId("food"),
          position: index,
        };
      }),
    },
  };
}

export function createLibraryDragPayload(
  input: { type: "FOOD"; food: SavedMealPlanLibraryFood } | { type: "MEAL"; meal: SavedMealPlanLibraryMeal },
): MealPlanLibraryDragPayload {
  return input.type === "FOOD"
    ? { type: "meal-plan-library-food", food: input.food }
    : { type: "meal-plan-library-meal", meal: input.meal };
}

export function parseLibraryDragPayload(rawValue: string): MealPlanLibraryDragPayload | null {
  if (!rawValue) return null;
  try {
    const value = JSON.parse(rawValue) as Partial<MealPlanLibraryDragPayload>;
    if (value.type === "meal-plan-library-food" && value.food && typeof value.food === "object") {
      return value as MealPlanLibraryDragPayload;
    }
    if (value.type === "meal-plan-library-meal" && value.meal && typeof value.meal === "object") {
      return value as MealPlanLibraryDragPayload;
    }
  } catch {
    return null;
  }
  return null;
}
