import { describe, it, expect } from "vitest";
import { calculateBodyFatKg, calculateLeanMassKg } from "../calculateBodyComposition";

describe("calculateBodyComposition", () => {
  describe("calculateBodyFatKg", () => {
    it("calculates fat kg correctly", () => {
      expect(calculateBodyFatKg(100, 20)).toBe(20);
      expect(calculateBodyFatKg(75.5, 22.3)).toBe(16.84);
    });

    it("returns null for invalid inputs", () => {
      expect(calculateBodyFatKg(null, 20)).toBeNull();
      expect(calculateBodyFatKg(100, null)).toBeNull();
      expect(calculateBodyFatKg(0, 20)).toBeNull();
      expect(calculateBodyFatKg(100, -5)).toBeNull();
      expect(calculateBodyFatKg(100, 105)).toBeNull();
    });
  });

  describe("calculateLeanMassKg", () => {
    it("calculates lean mass correctly", () => {
      expect(calculateLeanMassKg(100, 20)).toBe(80);
      expect(calculateLeanMassKg(75.5, 16.84)).toBe(58.66);
    });

    it("returns null for invalid inputs", () => {
      expect(calculateLeanMassKg(null, 20)).toBeNull();
      expect(calculateLeanMassKg(100, null)).toBeNull();
      expect(calculateLeanMassKg(0, 20)).toBeNull();
      expect(calculateLeanMassKg(100, -5)).toBeNull();
    });

    it("returns null if lean mass would be negative", () => {
      expect(calculateLeanMassKg(50, 60)).toBeNull();
    });

    it("handles bodyFatKg = 0 (all lean mass)", () => {
      expect(calculateLeanMassKg(80, 0)).toBe(80);
    });
  });
});

describe("calculateBodyFatKg boundary", () => {
  it("handles bodyFatPercentage = 0 (zero fat kg)", () => {
    expect(calculateBodyFatKg(80, 0)).toBe(0);
  });

  it("handles bodyFatPercentage = 100 (weight = fat kg)", () => {
    expect(calculateBodyFatKg(80, 100)).toBe(80);
  });
});
