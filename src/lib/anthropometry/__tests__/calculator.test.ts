import { describe, expect, it } from "vitest";
import {
  averageSkinfoldReadings,
  calculateAssessmentSummary,
  calculateBmi,
  calculateSkinfoldAssessment,
  calculateWaistHeightRatio,
  calculateWaistHipRatio,
  classifyBmiForProfile,
  classifyWaistHeightRisk,
  classifyWaistHipRisk,
  getHighVariationSkinfoldSites,
  serializeSkinfoldMeasurementsJson,
  suggestAssessmentProfile,
} from "../index";

describe("anthropometry profile and BMI calculator", () => {
  it("suggests a profile from age without overriding an explicit clinical choice", () => {
    expect(suggestAssessmentProfile(8)).toBe("CHILD");
    expect(suggestAssessmentProfile(18)).toBe("ADULT");
    expect(suggestAssessmentProfile(60)).toBe("ELDERLY");
    expect(suggestAssessmentProfile(null)).toBe("ADULT");
  });

  it("calculates BMI from meters or centimeters", () => {
    expect(calculateBmi(70, 1.75)).toBe(22.86);
    expect(calculateBmi(70, 175)).toBe(22.86);
  });

  it("uses adult and elderly cutoffs independently", () => {
    expect(classifyBmiForProfile("ADULT", 22).code).toBe("ADULT_NORMAL");
    expect(classifyBmiForProfile("ELDERLY", 22).code).toBe("ELDERLY_EUTROPHIC");
    expect(classifyBmiForProfile("ELDERLY", 21.99).code).toBe("ELDERLY_UNDERWEIGHT");
    expect(classifyBmiForProfile("ELDERLY", 27.01).code).toBe("ELDERLY_OVERWEIGHT");
  });

  it("never applies adult BMI cutoffs to children", () => {
    const child = classifyBmiForProfile("CHILD", 27);
    expect(child.status).toBe("NOT_CLASSIFIABLE");
    expect(child.code).toBeNull();
    expect(child.reference).toBe("WHO_BMI_FOR_AGE_REQUIRED");
  });
});

describe("anthropometry ratio calculator", () => {
  it("calculates RCQ and RCE with height supplied in meters", () => {
    expect(calculateWaistHipRatio(80, 100)).toBe(0.8);
    expect(calculateWaistHeightRatio(80, 1.6)).toBe(0.5);
  });

  it("uses sex-specific RCQ thresholds and does not classify children", () => {
    expect(classifyWaistHipRisk(0.89, "M", "ADULT").code).toBe("LOW");
    expect(classifyWaistHipRisk(0.9, "M", "ADULT").code).toBe("INCREASED");
    expect(classifyWaistHipRisk(0.85, "F", "ELDERLY").code).toBe("INCREASED");
    expect(classifyWaistHipRisk(0.8, "F", "CHILD").status).toBe("NOT_CLASSIFIABLE");
  });

  it("classifies RCE only when the selected profile supports adult references", () => {
    expect(classifyWaistHeightRisk(0.49, "ADULT").code).toBe("HEALTHY");
    expect(classifyWaistHeightRisk(0.5, "ELDERLY").code).toBe("INCREASED");
    expect(classifyWaistHeightRisk(0.62, "ADULT").code).toBe("HIGH");
    expect(classifyWaistHeightRisk(0.49, "CHILD").status).toBe("NOT_CLASSIFIABLE");
  });
});

describe("clinical skinfold engine", () => {
  it("averages up to three readings and identifies high measurement variation", () => {
    expect(averageSkinfoldReadings({ first: 10, second: 11, third: 10 })).toBe(10.33);
    expect(getHighVariationSkinfoldSites({ triceps: { first: 10, second: 12, third: 10 } })).toEqual(["triceps"]);
    expect(getHighVariationSkinfoldSites({ triceps: { first: 10, second: 10.2, third: 10.1 } })).toEqual([]);
  });

  it("calculates Jackson-Pollock 3 with density, Siri, and body composition", () => {
    const result = calculateSkinfoldAssessment({
      protocol: "POLLOCK_3_MALE",
      profile: "ADULT",
      sex: "M",
      age: 30,
      weight: 75,
      measurements: {
        chest: { first: 15, second: 15, third: 15 },
        abdominal: { first: 20, second: 20, third: 20 },
        thigh: { first: 18, second: 18, third: 18 },
      },
    });

    expect(result?.status).toBe("READY");
    expect(result?.formula).toBe("JACKSON_POLLOCK_3_MALE_SIRI");
    expect(result?.sum).toBe(53);
    expect(result?.bodyDensity).toBeGreaterThan(1);
    expect(result?.bodyFatPercentage).toBeGreaterThan(0);
    expect(result?.bodyFatKg).not.toBeNull();
    expect(result?.leanMassKg).not.toBeNull();
    expect((result?.bodyFatKg ?? 0) + (result?.leanMassKg ?? 0)).toBeCloseTo(75, 1);
  });

  it("does not calculate a protocol from incomplete skinfolds", () => {
    const result = calculateSkinfoldAssessment({
      protocol: "POLLOCK_3_MALE",
      profile: "ADULT",
      sex: "M",
      age: 30,
      measurements: { chest: { first: 15 } },
    });

    expect(result?.status).toBe("INCOMPLETE");
    expect(result?.bodyFatPercentage).toBeNull();
    expect(result?.warnings).toContain("MISSING_REQUIRED_READINGS");
  });

  it("uses all four Durnin-Womersley sites, including biceps", () => {
    const withoutBiceps = calculateSkinfoldAssessment({
      protocol: "DURNIN_WOMERSLEY",
      profile: "ADULT",
      sex: "F",
      age: 35,
      measurements: {
        triceps: { first: 15 },
        subscapular: { first: 12 },
        suprailiac: { first: 14 },
      },
    });
    expect(withoutBiceps?.status).toBe("INCOMPLETE");

    const complete = calculateSkinfoldAssessment({
      protocol: "DURNIN_WOMERSLEY",
      profile: "ADULT",
      sex: "F",
      age: 35,
      measurements: {
        biceps: { first: 10 },
        triceps: { first: 15 },
        subscapular: { first: 12 },
        suprailiac: { first: 14 },
      },
    });
    expect(complete?.status).toBe("READY");
    expect(complete?.sum).toBe(51);
    expect(complete?.formula).toBe("DURNIN_WOMERSLEY_4_SITE_SIRI");
  });

  it.each([
    { sex: "M" as const, age: 19, intercept: 1.162, slope: 0.063 },
    { sex: "M" as const, age: 20, intercept: 1.1631, slope: 0.0632 },
    { sex: "M" as const, age: 30, intercept: 1.1422, slope: 0.0544 },
    { sex: "M" as const, age: 40, intercept: 1.162, slope: 0.07 },
    { sex: "M" as const, age: 50, intercept: 1.1715, slope: 0.0779 },
    { sex: "F" as const, age: 19, intercept: 1.1549, slope: 0.0678 },
    { sex: "F" as const, age: 20, intercept: 1.1599, slope: 0.0717 },
    { sex: "F" as const, age: 30, intercept: 1.1423, slope: 0.0632 },
    { sex: "F" as const, age: 40, intercept: 1.1333, slope: 0.0612 },
    { sex: "F" as const, age: 50, intercept: 1.1339, slope: 0.0645 },
  ])("uses the correct Durnin-Womersley coefficient band for $sex age $age", ({ sex, age, intercept, slope }) => {
    const result = calculateSkinfoldAssessment({
      protocol: "DURNIN_WOMERSLEY",
      profile: "ADULT",
      sex,
      age,
      measurements: {
        biceps: { first: 10 },
        triceps: { first: 15 },
        subscapular: { first: 12 },
        suprailiac: { first: 14 },
      },
    });

    const expectedDensity = Number((intercept - slope * Math.log10(51)).toFixed(5));
    expect(result?.status).toBe("READY");
    expect(result?.bodyDensity).toBe(expectedDensity);
  });

  it("uses Slaughter for child profiles without forcing an adult density formula", () => {
    const result = calculateSkinfoldAssessment({
      protocol: "SLAUGHTER",
      profile: "CHILD",
      sex: "F",
      age: 12,
      weight: 40,
      measurements: {
        triceps: { first: 10 },
        subscapular: { first: 12 },
      },
    });

    expect(result?.status).toBe("READY");
    expect(result?.bodyDensity).toBeNull();
    expect(result?.bodyFatPercentage).toBeGreaterThan(0);
    expect(result?.formula).toBe("SLAUGHTER_TRICEPS_SUBSCAPULAR");
  });

  it("keeps manual protocol to a sum and does not fabricate a body-fat percentage", () => {
    const result = calculateSkinfoldAssessment({
      protocol: "MANUAL",
      profile: "ADULT",
      sex: "UNSPECIFIED",
      age: null,
      measurements: {
        triceps: { first: 10 },
        supraSpinal: { first: 12 },
      },
    });

    expect(result?.status).toBe("MANUAL");
    expect(result?.sum).toBe(22);
    expect(result?.bodyFatPercentage).toBeNull();
    expect(result?.warnings).toContain("MANUAL_PROTOCOL_NO_BODY_FAT");
  });
});

describe("calculateAssessmentSummary", () => {
  it("recomputes all persisted derived fields from raw inputs", () => {
    const skinfoldMeasurements = serializeSkinfoldMeasurementsJson({
      triceps: { first: 10, second: 10, third: 10 },
      subscapular: { first: 12, second: 12, third: 12 },
    });

    const summary = calculateAssessmentSummary({
      profile: "CHILD",
      sex: "F",
      age: 12,
      weight: 40,
      height: 1.4,
      waist: 60,
      hip: 70,
      protocol: "SLAUGHTER",
      skinfoldMeasurements,
    });

    expect(summary.bmi).toBe(20.41);
    expect(summary.bmiClassification).toBeNull();
    expect(summary.bmiClassificationStatus).toBe("NOT_CLASSIFIABLE");
    expect(summary.waistHipRatio).toBe(0.86);
    expect(summary.waistHeightRatio).toBe(0.43);
    expect(summary.waistHipRisk).toBeNull();
    expect(summary.waistHeightRisk).toBeNull();
    expect(summary.skinfoldProtocol).toBe("SLAUGHTER");
    expect(summary.skinfoldMeasurements?.version).toBe(1);
    expect(summary.skinfoldSum).toBe(22);
    expect(summary.bodyFatPercentage).toBeGreaterThan(0);
  });
});
