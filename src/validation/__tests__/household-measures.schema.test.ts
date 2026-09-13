import { describe, expect, it } from "vitest";
import {
  convertGramsToHouseholdMeasuresSchema,
  convertHouseholdMeasureToGramsSchema,
  createCustomHouseholdMeasureSchema,
} from "../household-measures.schema";

describe("household measures schemas", () => {
  it("accepts grams conversion with food identity", () => {
    const parsed = convertGramsToHouseholdMeasuresSchema.parse({
      tacoFoodId: "1",
      grams: 100,
    });

    expect(parsed.grams).toBe(100);
  });

  it("rejects conversion without tacoFoodId or foodName", () => {
    const result = convertGramsToHouseholdMeasuresSchema.safeParse({ grams: 100 });

    expect(result.success).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(convertGramsToHouseholdMeasuresSchema.safeParse({ foodName: "arroz", grams: Number.NaN }).success).toBe(false);
    expect(convertHouseholdMeasureToGramsSchema.safeParse({ foodName: "arroz", measureId: "x", quantity: Infinity }).success).toBe(false);
  });

  it("requires nutritionistId for custom measures", () => {
    const result = createCustomHouseholdMeasureSchema.safeParse({
      foodName: "arroz",
      measureName: "minha colher",
      grams: 24,
    });

    expect(result.success).toBe(false);
  });

  it("accepts custom measure with source and confidence", () => {
    const parsed = createCustomHouseholdMeasureSchema.parse({
      nutritionistId: "nutri-1",
      foodName: "arroz",
      measureName: "minha colher",
      grams: 24,
      source: "NUTRITIONIST_CUSTOM",
      confidence: "LOW",
    });

    expect(parsed.source).toBe("NUTRITIONIST_CUSTOM");
    expect(parsed.confidence).toBe("LOW");
  });
});
