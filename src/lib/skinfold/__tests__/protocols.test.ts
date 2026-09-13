import { describe, expect, it } from "vitest";
import { calculateSkinfold, type Protocol } from "../protocols";

const FULL_INPUT = {
  age: 30,
  sex: "M" as const,
  weight: 75,
  chest: 15,
  axillary: 12,
  triceps: 14,
  subscapular: 16,
  abdominal: 20,
  suprailiac: 13,
  thigh: 18,
  medialCalf: 10,
};

const ALL_PROTOCOLS: Protocol[] = [
  "POLLOCK_3_MALE",
  "POLLOCK_3_FEMALE",
  "POLLOCK_7",
  "GUEDES",
  "PETROSKI_MALE",
  "PETROSKI_FEMALE",
  "DURNIN_WOMERSLEY",
];

describe("calculateSkinfold", () => {
  it.each(ALL_PROTOCOLS)("%s returns plausible bodyFatPct for typical inputs", (protocol) => {
    const r = calculateSkinfold(protocol, FULL_INPUT);
    expect(r.bodyFatPct).toBeGreaterThan(0);
    expect(r.bodyFatPct).toBeLessThan(60);
    expect(r.bodyDensity).toBeGreaterThan(0.9);
    expect(r.bodyDensity).toBeLessThan(1.2);
  });

  it("returns null bodyFatKg and leanMassKg when weight is absent", () => {
    const r = calculateSkinfold("POLLOCK_3_MALE", { age: 30, sex: "M", chest: 15, abdominal: 20, thigh: 18 });
    expect(r.bodyFatKg).toBeNull();
    expect(r.leanMassKg).toBeNull();
  });

  it("bodyFatKg + leanMassKg equals weight when weight is provided", () => {
    const r = calculateSkinfold("POLLOCK_3_MALE", { age: 30, sex: "M", weight: 80, chest: 15, abdominal: 20, thigh: 18 });
    expect(r.bodyFatKg).not.toBeNull();
    expect(r.leanMassKg).not.toBeNull();
    expect(r.bodyFatKg! + r.leanMassKg!).toBeCloseTo(80, 0);
  });

  it("higher skinfold sum yields higher bodyFatPct (POLLOCK_3_MALE)", () => {
    const lean = calculateSkinfold("POLLOCK_3_MALE", { age: 30, sex: "M", chest: 8, abdominal: 10, thigh: 10 });
    const obese = calculateSkinfold("POLLOCK_3_MALE", { age: 30, sex: "M", chest: 30, abdominal: 40, thigh: 35 });
    expect(obese.bodyFatPct).toBeGreaterThan(lean.bodyFatPct);
  });

  it("POLLOCK_7 produces different results for M and F with same skinfolds", () => {
    const male = calculateSkinfold("POLLOCK_7", { ...FULL_INPUT, sex: "M" });
    const female = calculateSkinfold("POLLOCK_7", { ...FULL_INPUT, sex: "F" });
    expect(male.bodyFatPct).not.toEqual(female.bodyFatPct);
  });

  it("POLLOCK_3_FEMALE returns plausible result for female-typical inputs", () => {
    const r = calculateSkinfold("POLLOCK_3_FEMALE", {
      age: 25,
      sex: "F",
      weight: 60,
      triceps: 18,
      suprailiac: 14,
      thigh: 22,
    });
    expect(r.bodyFatPct).toBeGreaterThan(10);
    expect(r.bodyFatPct).toBeLessThan(50);
    expect(r.bodyFatKg).not.toBeNull();
    expect(r.leanMassKg).not.toBeNull();
  });

  it("GUEDES uses log10 formula and differentiates M vs F skinfold sites", () => {
    const male = calculateSkinfold("GUEDES", {
      age: 30,
      sex: "M",
      subscapular: 15,
      abdominal: 20,
      thigh: 18,
    });
    const female = calculateSkinfold("GUEDES", {
      age: 30,
      sex: "F",
      subscapular: 15,
      suprailiac: 12,
      thigh: 18,
    });
    expect(male.bodyFatPct).toBeGreaterThan(0);
    expect(female.bodyFatPct).toBeGreaterThan(0);
    // Male and female use different formulas, so different densities
    expect(male.bodyDensity).not.toBeCloseTo(female.bodyDensity!, 3);
  });

  it("DURNIN_WOMERSLEY applies age-stratified constants", () => {
    const young = calculateSkinfold("DURNIN_WOMERSLEY", {
      age: 22,
      sex: "M",
      triceps: 12,
      subscapular: 14,
      suprailiac: 10,
    });
    const older = calculateSkinfold("DURNIN_WOMERSLEY", {
      age: 45,
      sex: "M",
      triceps: 12,
      subscapular: 14,
      suprailiac: 10,
    });
    // Different age brackets → different density constants → different results
    expect(young.bodyDensity).not.toBeCloseTo(older.bodyDensity!, 3);
  });

  it("bodyFatKg is derived from bodyFatPct and weight with correct formula", () => {
    const r = calculateSkinfold("POLLOCK_3_MALE", {
      age: 25,
      sex: "M",
      weight: 70,
      chest: 12,
      abdominal: 18,
      thigh: 15,
    });
    const expectedFatKg = parseFloat(((r.bodyFatPct / 100) * 70).toFixed(2));
    expect(r.bodyFatKg).toBeCloseTo(expectedFatKg, 1);
  });
});
