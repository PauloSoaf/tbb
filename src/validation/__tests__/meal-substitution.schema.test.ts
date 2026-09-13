import { describe, expect, it } from "vitest";
import {
  createSubstitutionGroupSchema,
  createSubstitutionItemSchema,
  equivalenceBasisSchema,
} from "../meal-substitution.schema";

describe("meal-substitution schemas", () => {
  it("accepts a valid group and defaults visibleToPatient", () => {
    const parsed = createSubstitutionGroupSchema.parse({
      mealPlanId: "plan_1",
      title: "Frutas equivalentes",
      equivalenceBasis: "CALORIES",
    });
    expect(parsed.visibleToPatient).toBe(true);
    expect(parsed.type).toBe("ITEM_REPLACEMENT");
  });

  it("rejects group without title", () => {
    expect(() => createSubstitutionGroupSchema.parse({ mealPlanId: "plan_1", title: "" })).toThrow();
  });

  it("rejects item with negative quantity", () => {
    expect(() => createSubstitutionItemSchema.parse({
      groupId: "group_1",
      foodName: "Maca",
      quantity: -1,
    })).toThrow();
  });

  it("rejects negative macros", () => {
    expect(() => createSubstitutionItemSchema.parse({
      groupId: "group_1",
      foodName: "Maca",
      calories: -10,
    })).toThrow();
  });

  it("accepts valid equivalence basis enum", () => {
    expect(equivalenceBasisSchema.parse("PROTEIN")).toBe("PROTEIN");
  });
});
