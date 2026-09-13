import { describe, expect, it } from "vitest";
import { calculateMacros } from "../macro-calculator";

describe("calculateMacros", () => {
  it("calculates protein grams (4 kcal/g)", () => {
    const result = calculateMacros(2000, 25, 50, 25);
    expect(result.proteinG).toBe(Math.round((2000 * 0.25) / 4)); // 125g
  });

  it("calculates carbs grams (4 kcal/g)", () => {
    const result = calculateMacros(2000, 25, 50, 25);
    expect(result.carbsG).toBe(Math.round((2000 * 0.50) / 4)); // 250g
  });

  it("calculates fat grams (9 kcal/g)", () => {
    const result = calculateMacros(2000, 25, 50, 25);
    expect(result.fatG).toBe(Math.round((2000 * 0.25) / 9)); // 56g
  });

  it("returns total percentage as sum of inputs", () => {
    const result = calculateMacros(1800, 25, 45, 30);
    expect(result.total).toBe(100);
  });

  it("returns total !== 100 when percentages are off", () => {
    const result = calculateMacros(1800, 30, 50, 30);
    expect(result.total).toBe(110);
  });

  it("handles 1800 kcal standard diet correctly", () => {
    const result = calculateMacros(1800, 25, 45, 30);
    expect(result.proteinG).toBe(113);  // (1800*0.25)/4
    expect(result.carbsG).toBe(203);    // (1800*0.45)/4
    expect(result.fatG).toBe(60);       // (1800*0.30)/9
  });

  it("returns all zeros when kcal is 0", () => {
    const result = calculateMacros(0, 25, 50, 25);
    expect(result.proteinG).toBe(0);
    expect(result.carbsG).toBe(0);
    expect(result.fatG).toBe(0);
    expect(result.total).toBe(100);
  });

  it("returns 0g for macro with 0% allocation", () => {
    const result = calculateMacros(2000, 0, 70, 30);
    expect(result.proteinG).toBe(0);
    expect(result.carbsG).toBeGreaterThan(0);
    expect(result.fatG).toBeGreaterThan(0);
  });
});
