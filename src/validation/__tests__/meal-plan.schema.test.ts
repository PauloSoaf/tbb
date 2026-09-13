import { describe, expect, it } from "vitest";
import { createMealPlanSchema, createMealItemSchema } from "../meal-plan.schema";

describe("createMealPlanSchema", () => {
  it("accepts minimal valid plan (title only)", () => {
    const result = createMealPlanSchema.safeParse({ title: "Plano Low Carb" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createMealPlanSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative targetCalories", () => {
    const result = createMealPlanSchema.safeParse({ title: "Plano", targetCalories: -100 });
    expect(result.success).toBe(false);
  });

  it("accepts targetCalories zero", () => {
    const result = createMealPlanSchema.safeParse({ title: "Plano", targetCalories: 0 });
    expect(result.success).toBe(true);
  });
});

describe("createMealItemSchema (TACO refinement)", () => {
  const base = {
    mealId: "meal-1",
    foodName: "Arroz branco",
    quantity: 100,
    unit: "g",
    calories: 130,
    protein: 2.5,
    carbs: 28,
    fat: 0.2,
  };

  it("accepts CUSTOM source without tacoFoodId", () => {
    const result = createMealItemSchema.safeParse({ ...base, source: "CUSTOM" });
    expect(result.success).toBe(true);
  });

  it("accepts TACO source with tacoFoodId", () => {
    const result = createMealItemSchema.safeParse({ ...base, source: "TACO", tacoFoodId: "taco-123" });
    expect(result.success).toBe(true);
  });

  it("rejects TACO source without tacoFoodId", () => {
    const result = createMealItemSchema.safeParse({ ...base, source: "TACO" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("tacoFoodId");
  });

  it("rejects negative quantity", () => {
    const result = createMealItemSchema.safeParse({ ...base, source: "CUSTOM", quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative calories", () => {
    const result = createMealItemSchema.safeParse({ ...base, source: "CUSTOM", calories: -10 });
    expect(result.success).toBe(false);
  });
});
