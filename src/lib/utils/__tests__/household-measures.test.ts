import { describe, expect, it } from "vitest";
import {
  calculateNutritionFromHouseholdMeasure,
  convertGramsToHouseholdMeasures,
  convertHouseholdMeasureToGrams,
  searchHouseholdMeasuresForFood,
  suggestBestHouseholdMeasure,
} from "../household-measures";

const rice = {
  id: 1,
  description: "Arroz, branco, cozido",
  kcal: 128,
  protein: 2.5,
  carbohydrate: 28.1,
  lipid: 0.2,
  fiber: 1.6,
};

describe("household measures", () => {
  it("converts 100g into 4 tablespoons when each tablespoon has 25g", () => {
    const result = convertGramsToHouseholdMeasures({
      tacoFoodId: "1",
      foodName: rice.description,
      grams: 100,
    });

    expect(result.suggestions[0].measureQuantity).toBe(4);
    expect(result.suggestions[0].gramsPerMeasure).toBe(25);
    expect(result.suggestions[0].estimatedGrams).toBe(100);
    expect(result.suggestions[0].measure.key).toBe("TABLE_SPOON_HEAPED");
    expect(result.suggestions[0].isDefault).toBe(true);
  });

  it("converts 2 tablespoons of 25g into 50g", () => {
    const measure = searchHouseholdMeasuresForFood({ tacoFoodId: "1", foodName: rice.description })[0];

    expect(convertHouseholdMeasureToGrams({ measure, quantity: 2 })).toBe(50);
  });

  it("calculates nutrition for 50g as half of the 100g reference", () => {
    const measure = searchHouseholdMeasuresForFood({ tacoFoodId: "1", foodName: rice.description })[0];
    const result = calculateNutritionFromHouseholdMeasure({ food: rice, measure, quantity: 2 });

    expect(result.grams).toBe(50);
    expect(result.nutrition.calories).toBe(64);
    expect(result.nutrition.protein).toBe(1.25);
    expect(result.nutrition.carbs).toBe(14.05);
    expect(result.nutrition.fat).toBe(0.1);
  });

  it("does not return NaN for valid conversions", () => {
    const suggestion = suggestBestHouseholdMeasure({ tacoFoodId: "1", foodName: rice.description, grams: 100 });

    expect(suggestion).not.toBeNull();
    expect(Number.isNaN(suggestion?.estimatedGrams)).toBe(false);
  });

  it("rejects negative quantities", () => {
    const measure = searchHouseholdMeasuresForFood({ tacoFoodId: "1", foodName: rice.description })[0];

    expect(() => convertHouseholdMeasureToGrams({ measure, quantity: -1 })).toThrow();
  });

  it("keeps source and confidence in suggestions", () => {
    const result = convertGramsToHouseholdMeasures({
      tacoFoodId: "1",
      foodName: rice.description,
      grams: 100,
    });

    expect(result.suggestions[0].source).toBe("CURATED");
    expect(result.suggestions[0].confidence).toBe("MEDIUM");
    expect(result.suggestions[0].minGrams).toBe(20);
    expect(result.suggestions[0].maxGrams).toBe(30);
  });

  it("returns empty suggestions when food has no registered household measure", () => {
    const result = convertGramsToHouseholdMeasures({
      tacoFoodId: "not-found",
      foodName: "Alimento sem cadastro",
      grams: 100,
    });

    expect(result.suggestions).toEqual([]);
  });
});
