import { describe, it, expect } from "vitest";
import {
  roundNutritionValue,
  calculateProportionalNutrition,
  parseTacoFoodToMealItem,
  parseNutritionNumber,
  getTacoCarbohydrate,
  calculateMealTotals,
  calculateMealPlanTotals,
  TacoFoodData,
  PartialMealItem
} from "../nutrition";

describe("Nutrition Utilities", () => {
  describe("roundNutritionValue", () => {
    it("rounds to two decimal places", () => {
      expect(roundNutritionValue(10.555)).toBe(10.56);
      expect(roundNutritionValue(10.554)).toBe(10.55);
    });

    it("returns 0 for negative, null, undefined, or NaN", () => {
      expect(roundNutritionValue(-5)).toBe(0);
      expect(roundNutritionValue(null)).toBe(0);
      expect(roundNutritionValue(undefined)).toBe(0);
      expect(roundNutritionValue(NaN)).toBe(0);
    });

    it("normalizes decimal comma strings", () => {
      expect(parseNutritionNumber("28,1")).toBe(28.1);
      expect(roundNutritionValue("13,666")).toBe(13.67);
    });
  });

  describe("calculateProportionalNutrition", () => {
    it("calculates correctly for 100g", () => {
      expect(calculateProportionalNutrition(128, 100)).toBe(128);
    });

    it("calculates correctly for 150g", () => {
      expect(calculateProportionalNutrition(128, 150)).toBe(192);
    });

    it("calculates correctly for 50g", () => {
      expect(calculateProportionalNutrition(128, 50)).toBe(64);
    });

    it("handles negative quantity gracefully", () => {
      expect(calculateProportionalNutrition(128, -50)).toBe(0);
    });

    it("returns 0 for zero quantity", () => {
      expect(calculateProportionalNutrition(128, 0)).toBe(0);
    });
  });

  describe("parseTacoFoodToMealItem", () => {
    const mockTaco: TacoFoodData = {
      id: "1",
      description: "Arroz, integral, cozido",
      kcal: 124,
      protein: 2.6,
      carbohydrate: 25.8,
      lipid: 1.0,
      fiber: 2.7,
      sodium: 1,
    };

    it("parses correctly for 100g default", () => {
      const result = parseTacoFoodToMealItem(mockTaco);
      expect(result.foodName).toBe("Arroz, integral, cozido");
      expect(result.source).toBe("TACO");
      expect(result.quantity).toBe(100);
      expect(result.calories).toBe(124);
      expect(result.protein).toBe(2.6);
      expect(result.carbs).toBe(25.8);
      expect(result.fat).toBe(1);
    });

    it("parses correctly for 150g", () => {
      const result = parseTacoFoodToMealItem(mockTaco, 150);
      expect(result.quantity).toBe(150);
      expect(result.calories).toBe(186); // 124 * 1.5
      expect(result.protein).toBe(3.9);  // 2.6 * 1.5
      expect(result.carbs).toBe(38.7);   // 25.8 * 1.5
      expect(result.fat).toBe(1.5);      // 1 * 1.5
    });

    it("uses carbohydrate aliases when the TACO source shape changes", () => {
      const tacoWithAlias: TacoFoodData = {
        id: "3",
        description: "Feijao, carioca, cozido",
        kcal: "76",
        protein: "4,8",
        carbs: "13,6",
        fat: "0,5",
      };
      const result = parseTacoFoodToMealItem(tacoWithAlias, 100);
      expect(getTacoCarbohydrate(tacoWithAlias)).toBe(13.6);
      expect(result.carbs).toBe(13.6);
      expect(result.protein).toBe(4.8);
      expect(result.fat).toBe(0.5);
    });

    it("handles missing taco fields as 0", () => {
      const incompleteTaco: TacoFoodData = { id: "2", description: "Água" };
      const result = parseTacoFoodToMealItem(incompleteTaco, 100);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
    });

    it("returns all zero macros for zero quantity", () => {
      const result = parseTacoFoodToMealItem(mockTaco, 0);
      expect(result.quantity).toBe(0);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });
  });

  describe("calculateMealTotals", () => {
    it("sums up meal items correctly", () => {
      const items: PartialMealItem[] = [
        { calories: 100, protein: 10, carbs: 10, fat: 2, foodName: "", source: "CUSTOM", quantity: 100, unit: "g" },
        { calories: 50, protein: 5, carbs: 5, fat: 1, foodName: "", source: "CUSTOM", quantity: 50, unit: "g" },
      ];
      const totals = calculateMealTotals(items);
      expect(totals).toEqual({ calories: 150, protein: 15, carbs: 15, fat: 3 });
    });

    it("returns zeros for empty items array", () => {
      const totals = calculateMealTotals([]);
      expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
  });

  describe("calculateMealPlanTotals", () => {
    it("sums up all meals correctly", () => {
      const meals = [
        {
          items: [
            { calories: 100, protein: 10, carbs: 10, fat: 2, foodName: "", source: "CUSTOM", quantity: 1, unit: "g" } as PartialMealItem
          ]
        },
        {
          items: [
            { calories: 200, protein: 20, carbs: 20, fat: 4, foodName: "", source: "CUSTOM", quantity: 1, unit: "g" } as PartialMealItem
          ]
        }
      ];
      const totals = calculateMealPlanTotals(meals);
      expect(totals).toEqual({ calories: 300, protein: 30, carbs: 30, fat: 6 });
    });

    it("returns zeros for empty meals array", () => {
      const totals = calculateMealPlanTotals([]);
      expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it("returns zeros for meals with no items", () => {
      const totals = calculateMealPlanTotals([{ items: [] }, { items: [] }]);
      expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
  });
});
