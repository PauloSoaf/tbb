import { describe, expect, it } from "vitest";
import {
  createShoppingListItemSchema,
  generateShoppingListSchema,
  toggleShoppingListItemSchema,
  updateShoppingListItemSchema,
} from "@/validation/shopping-list.schema";

describe("shopping list schemas", () => {
  it("accepts generation periods from 1 to 30 days", () => {
    expect(generateShoppingListSchema.parse({ mealPlanId: "plan-1", periodDays: 1 }).periodDays).toBe(1);
    expect(generateShoppingListSchema.parse({ mealPlanId: "plan-1", periodDays: 30 }).periodDays).toBe(30);
  });

  it("rejects invalid generation data", () => {
    expect(() => generateShoppingListSchema.parse({ mealPlanId: "", periodDays: 7 })).toThrow();
    expect(() => generateShoppingListSchema.parse({ mealPlanId: "plan-1", periodDays: 31 })).toThrow();
  });

  it("requires manual item name and positive quantities", () => {
    expect(createShoppingListItemSchema.parse({ name: "Banana", quantity: 2 })).toMatchObject({
      name: "Banana",
      quantity: 2,
      category: "OTHER",
      source: "MANUAL",
    });
    expect(() => createShoppingListItemSchema.parse({ name: "", quantity: 2 })).toThrow();
    expect(() => createShoppingListItemSchema.parse({ name: "Banana", quantity: 0 })).toThrow();
  });

  it("validates update and toggle payloads", () => {
    expect(updateShoppingListItemSchema.parse({ checked: true })).toEqual({});
    expect(toggleShoppingListItemSchema.parse({ checked: false })).toEqual({ checked: false });
  });
});
