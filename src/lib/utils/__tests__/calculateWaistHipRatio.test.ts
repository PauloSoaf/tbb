import { describe, it, expect } from "vitest";
import { calculateWaistHipRatio } from "../calculateWaistHipRatio";

describe("calculateWaistHipRatio", () => {
  it("calculates ratio correctly with 2 decimals", () => {
    expect(calculateWaistHipRatio(80, 100)).toBe(0.8);
    expect(calculateWaistHipRatio(85, 102)).toBe(0.83);
  });

  it("returns null if waist or hip is null/undefined", () => {
    expect(calculateWaistHipRatio(null, 100)).toBeNull();
    expect(calculateWaistHipRatio(80, null)).toBeNull();
    expect(calculateWaistHipRatio(undefined, undefined)).toBeNull();
  });

  it("returns null if waist or hip is zero or negative", () => {
    expect(calculateWaistHipRatio(0, 100)).toBeNull();
    expect(calculateWaistHipRatio(80, -10)).toBeNull();
  });

  it("returns 1.0 when waist equals hip", () => {
    expect(calculateWaistHipRatio(90, 90)).toBe(1);
  });

  it("handles decimal inputs with 2-decimal precision", () => {
    expect(calculateWaistHipRatio(78.5, 100)).toBe(0.79);
  });
});
