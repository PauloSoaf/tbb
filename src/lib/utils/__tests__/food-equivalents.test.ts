import { describe, expect, it } from "vitest";
import {
  calculateEquivalentByCalories,
  calculateEquivalentByCarbs,
  calculateEquivalentByProtein,
  calculateNutritionByQuantity,
  roundNutritionValue,
  safeNutritionNumber,
} from "../food-equivalents";

describe("food-equivalents", () => {
  const food = { kcal: 100, protein: 10, carbohydrate: 20, lipid: 5, fiber: 2, sodium: 50 };

  it("calculates nutrition for 100g", () => {
    expect(calculateNutritionByQuantity(food, 100)).toEqual({
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
      sodium: 50,
    });
  });

  it("calculates nutrition for 150g", () => {
    expect(calculateNutritionByQuantity(food, 150)).toEqual({
      calories: 150,
      protein: 15,
      carbs: 30,
      fat: 7.5,
      fiber: 3,
      sodium: 75,
    });
  });

  it("calculates equivalent by calories", () => {
    expect(calculateEquivalentByCalories({ calories: 89 }, { kcal: 52 })).toBe(171.15);
  });

  it("calculates equivalent by carbs", () => {
    expect(calculateEquivalentByCarbs({ carbs: 30 }, { carbohydrate: 20 })).toBe(150);
  });

  it("accepts carbohydrate aliases and decimal comma values", () => {
    expect(calculateNutritionByQuantity({ carbohydrates: "26,0" }, 100)).toMatchObject({
      carbs: 26,
    });
    expect(calculateEquivalentByCarbs({ carbs: 30 }, { CHO: "15,0" })).toBe(200);
  });

  it("calculates equivalent by protein", () => {
    expect(calculateEquivalentByProtein({ protein: 20 }, { protein: 10 })).toBe(200);
  });

  it("does not return NaN with missing data", () => {
    expect(calculateNutritionByQuantity({}, 100)).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
    });
    expect(calculateEquivalentByCalories({}, {})).toBeNull();
  });

  it("rounds and sanitizes values", () => {
    expect(roundNutritionValue(1.236)).toBe(1.24);
    expect(safeNutritionNumber(Number.NaN)).toBe(0);
    expect(safeNutritionNumber(-3)).toBe(0);
  });
});
