import { describe, it, expect } from "vitest";
import { patientMeasurementSchema } from "../patient-measurement.schema";

describe("patientMeasurementSchema", () => {
  it("validates a full correct measurement", () => {
    const validData = {
      measuredAt: "2023-10-01",
      source: "MANUAL",
      weight: 75.5,
      height: 1.75,
      waist: 80,
      hip: 100,
      bodyFatPercentage: 22.5,
      notes: "Some notes",
    };
    
    const result = patientMeasurementSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("allows all empty optional fields", () => {
    const validData = {
      source: "MANUAL",
    };
    
    const result = patientMeasurementSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails if numeric fields are negative", () => {
    const invalidData = {
      source: "MANUAL",
      weight: -10,
    };
    const result = patientMeasurementSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Peso deve ser positivo");
    }
  });

  it("fails if bodyFatPercentage is out of range", () => {
    const resultLow = patientMeasurementSchema.safeParse({ source: "MANUAL", bodyFatPercentage: -1 });
    expect(resultLow.success).toBe(false);

    const resultHigh = patientMeasurementSchema.safeParse({ source: "MANUAL", bodyFatPercentage: 105 });
    expect(resultHigh.success).toBe(false);
  });

  it("accepts all valid source enum values", () => {
    const sources = ["MANUAL", "BIOIMPEDANCE", "SKINFOLD", "PHOTO_ESTIMATION"];
    for (const source of sources) {
      expect(patientMeasurementSchema.safeParse({ source }).success).toBe(true);
    }
  });

  it("rejects invalid source enum", () => {
    const result = patientMeasurementSchema.safeParse({ source: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("accepts bodyFatPercentage at boundary values 0 and 100", () => {
    expect(patientMeasurementSchema.safeParse({ source: "MANUAL", bodyFatPercentage: 0 }).success).toBe(true);
    expect(patientMeasurementSchema.safeParse({ source: "MANUAL", bodyFatPercentage: 100 }).success).toBe(true);
  });

  it("rejects negative height", () => {
    const result = patientMeasurementSchema.safeParse({ source: "MANUAL", height: -1.75 });
    expect(result.success).toBe(false);
  });

  it("rejects zero for positive-required circumference fields", () => {
    const fields = ["waist", "hip", "neck", "chest", "abdomen", "thigh", "calf"] as const;
    for (const field of fields) {
      const result = patientMeasurementSchema.safeParse({ source: "MANUAL", [field]: 0 });
      expect(result.success).toBe(false);
    }
  });
});
