import { describe, it, expect } from "vitest";
import { calculateBMI } from "@/lib/utils/calculateBMI";

describe("calculateBMI", () => {
  it("calculates BMI correctly for weight 70kg height 1.75m", () => {
    expect(calculateBMI(70, 1.75)).toBe(22.86);
  });

  it("converts height in cm (>3) to meters", () => {
    expect(calculateBMI(70, 175)).toBe(22.86);
  });

  it("returns null when weight is null", () => {
    expect(calculateBMI(null, 1.75)).toBeNull();
  });

  it("returns null when height is null", () => {
    expect(calculateBMI(70, null)).toBeNull();
  });

  it("returns null when weight is 0", () => {
    expect(calculateBMI(0, 1.75)).toBeNull();
  });

  it("returns null when height is 0", () => {
    expect(calculateBMI(70, 0)).toBeNull();
  });

  it("returns null when both are undefined", () => {
    expect(calculateBMI(undefined, undefined)).toBeNull();
  });

  it("calculates correctly for obese BMI", () => {
    const bmi = calculateBMI(120, 1.70);
    expect(bmi).toBe(41.52);
  });
});
