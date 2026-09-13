import { describe, it, expect } from "vitest";
import { nativeMealPlanTemplates } from "../meal-plan-templates";

describe("nativeMealPlanTemplates data integrity", () => {
  it("has at least one template", () => {
    expect(nativeMealPlanTemplates.length).toBeGreaterThan(0);
  });

  it("all template IDs are unique", () => {
    const ids = nativeMealPlanTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all templates have required string fields", () => {
    for (const t of nativeMealPlanTemplates) {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.title).toBe("string");
      expect(t.title.length).toBeGreaterThan(0);
      expect(typeof t.objective).toBe("string");
      expect(typeof t.color).toBe("string");
    }
  });

  it("all templates have at least one meal", () => {
    for (const t of nativeMealPlanTemplates) {
      expect(t.meals.length).toBeGreaterThan(0);
    }
  });

  it("all meals have a name and at least one item", () => {
    for (const t of nativeMealPlanTemplates) {
      for (const meal of t.meals) {
        expect(typeof meal.name).toBe("string");
        expect(meal.name.length).toBeGreaterThan(0);
        expect(meal.items.length).toBeGreaterThan(0);
      }
    }
  });

  it("all item quantities are positive", () => {
    for (const t of nativeMealPlanTemplates) {
      for (const meal of t.meals) {
        for (const item of meal.items) {
          expect(item.quantity).toBeGreaterThan(0);
        }
      }
    }
  });

  it("all item nutritional values are non-negative", () => {
    for (const t of nativeMealPlanTemplates) {
      for (const meal of t.meals) {
        for (const item of meal.items) {
          expect(item.calories).toBeGreaterThanOrEqual(0);
          expect(item.protein).toBeGreaterThanOrEqual(0);
          expect(item.carbs).toBeGreaterThanOrEqual(0);
          expect(item.fat).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("template totals have positive calories (1000–6000 kcal daily range)", () => {
    for (const t of nativeMealPlanTemplates) {
      expect(t.totals.calories).toBeGreaterThan(1000);
      expect(t.totals.calories).toBeLessThan(6000);
    }
  });

  it("template totals have non-negative macro values", () => {
    for (const t of nativeMealPlanTemplates) {
      expect(t.totals.protein).toBeGreaterThanOrEqual(0);
      expect(t.totals.carbs).toBeGreaterThanOrEqual(0);
      expect(t.totals.fat).toBeGreaterThanOrEqual(0);
    }
  });
});
