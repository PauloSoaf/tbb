import { describe, expect, it } from "vitest";
import { ShoppingListCategory } from "@prisma/client";
import { normalizeFoodName, inferShoppingCategory } from "@/lib/utils/food-normalization";
import {
  aggregateShoppingItems,
  formatShoppingListText,
  generateShoppingListFromMealPlan,
  normalizeShoppingUnit,
} from "@/lib/utils/shopping-list";

describe("shopping list utils", () => {
  it("normalizes food names for matching", () => {
    expect(normalizeFoodName("  Ma\u00e7\u00e3, Fuji!!  ")).toBe("maca fuji");
  });

  it("infers categories from food keywords", () => {
    expect(inferShoppingCategory("Banana prata")).toBe(ShoppingListCategory.FRUITS);
    expect(inferShoppingCategory("Peito de frango")).toBe(ShoppingListCategory.PROTEINS);
    expect(inferShoppingCategory("Produto sem categoria")).toBe(ShoppingListCategory.OTHER);
  });

  it("normalizes common shopping units", () => {
    expect(normalizeShoppingUnit("gramas")).toBe("g");
    expect(normalizeShoppingUnit("Unidades")).toBe("un");
    expect(normalizeShoppingUnit(null)).toBeNull();
  });

  it("aggregates items by normalized name and unit", () => {
    const items = aggregateShoppingItems([
      { foodName: "Banana", quantity: 100, unit: "g" },
      { foodName: " banana ", quantity: 150, unit: "gramas" },
      { foodName: "Banana", quantity: 2, unit: "unidade" },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "Banana", quantity: 250, unit: "g" });
    expect(items[1]).toMatchObject({ name: "Banana", quantity: 2, unit: "un" });
  });

  it("generates a draft from a meal plan and multiplies by period", () => {
    const draft = generateShoppingListFromMealPlan({
      periodDays: 7,
      mealPlan: {
        id: "plan-1",
        title: "Plano base",
        patientId: "patient-1",
        meals: [
          {
            name: "Cafe",
            items: [
              { foodName: "Aveia", quantity: 30, unit: "g", mealItemId: "item-1" },
              { foodName: "Aveia", quantity: 20, unit: "gramas", mealItemId: "item-2" },
            ],
          },
        ],
      },
    });

    expect(draft.periodDays).toBe(7);
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({ name: "Aveia", quantity: 350, unit: "g" });
  });

  it("formats a copyable checklist text", () => {
    const text = formatShoppingListText({
      title: "Lista",
      periodDays: 3,
      items: [
        {
          name: "Banana",
          quantity: 300,
          unit: "g",
          category: ShoppingListCategory.FRUITS,
          checked: false,
        },
      ],
    });

    expect(text).toContain("3 dia");
    expect(text).toContain("[ ] Banana - 300g");
  });
});
