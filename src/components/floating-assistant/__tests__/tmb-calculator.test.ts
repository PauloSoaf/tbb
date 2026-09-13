import { describe, expect, it } from "vitest";
import { calculateTmb } from "../tmb-calculator";

describe("calculateTmb", () => {
  it("applies Mifflin-St Jeor formula for male (+5)", () => {
    // 10*70 + 6.25*170 - 5*30 + 5 = 700 + 1062.5 - 150 + 5 = 1617.5 → 1618
    const { tmb } = calculateTmb(70, 170, 30, "M", 1.0);
    expect(tmb).toBe(1618);
  });

  it("applies Mifflin-St Jeor formula for female (-161)", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 → 1345
    const { tmb } = calculateTmb(60, 165, 25, "F", 1.0);
    expect(tmb).toBe(1345);
  });

  it("multiplies TMB by activity factor to get GET", () => {
    const { tmb, get } = calculateTmb(70, 170, 30, "M", 1.55);
    expect(get).toBe(Math.round(tmb * 1.55));
  });

  it("sedentary factor 1.2 produces lower GET than active 1.725", () => {
    const sedentary = calculateTmb(70, 170, 30, "F", 1.2);
    const active    = calculateTmb(70, 170, 30, "F", 1.725);
    expect(active.get).toBeGreaterThan(sedentary.get);
  });

  it("returns rounded integer values", () => {
    const { tmb, get } = calculateTmb(68.5, 172, 28, "M", 1.375);
    expect(Number.isInteger(tmb)).toBe(true);
    expect(Number.isInteger(get)).toBe(true);
  });

  it("GET equals TMB when activity factor is 1.0", () => {
    const { tmb, get } = calculateTmb(70, 170, 30, "M", 1.0);
    expect(get).toBe(tmb);
  });

  it("male TMB is 166 higher than female for same inputs (constant sex offset diff)", () => {
    const male   = calculateTmb(70, 170, 30, "M", 1.0);
    const female = calculateTmb(70, 170, 30, "F", 1.0);
    // male adds +5, female subtracts -161 → difference = 166
    expect(male.tmb - female.tmb).toBe(166);
  });
});
