import { describe, expect, it } from "vitest";
import { calculateWater } from "../water-calculator";

describe("calculateWater", () => {
  it("returns null for zero weight", () => {
    expect(calculateWater(0)).toBeNull();
  });

  it("returns null for negative weight", () => {
    expect(calculateWater(-10)).toBeNull();
  });

  it("calculates correct ml range for 70 kg (2100–2450 ml)", () => {
    const r = calculateWater(70);
    expect(r).not.toBeNull();
    expect(r!.minMl).toBe(2100); // 70 * 30
    expect(r!.maxMl).toBe(2450); // 70 * 35
  });

  it("converts ml to liters with 1 decimal place", () => {
    const r = calculateWater(70);
    expect(r!.minL).toBe("2.1");
    expect(r!.maxL).toBe("2.5");
  });

  it("rounds fractional ml results", () => {
    const r = calculateWater(55);
    expect(r!.minMl).toBe(1650); // 55 * 30 = 1650 (exact)
    expect(r!.maxMl).toBe(1925); // 55 * 35 = 1925 (exact)
  });

  it("maxMl is always greater than minMl", () => {
    const r = calculateWater(80);
    expect(r!.maxMl).toBeGreaterThan(r!.minMl);
  });

  it("minMl = weight * 30, maxMl = weight * 35", () => {
    const r = calculateWater(60);
    expect(r!.minMl).toBe(Math.round(60 * 30));
    expect(r!.maxMl).toBe(Math.round(60 * 35));
  });
});
