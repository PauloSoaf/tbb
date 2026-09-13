import { describe, expect, it } from "vitest";
import { formatMeasurement } from "../formatMeasurement";

describe("formatMeasurement", () => {
  it("returns em-dash for null", () => {
    expect(formatMeasurement(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatMeasurement(undefined)).toBe("—");
  });

  it("appends unit with a space when provided", () => {
    expect(formatMeasurement(75, "kg")).toBe("75 kg");
  });

  it("returns value without unit when unit is omitted", () => {
    expect(formatMeasurement(75)).toBe("75");
  });

  it("uses pt-BR comma as decimal separator", () => {
    expect(formatMeasurement(1.5, "kg")).toBe("1,5 kg");
  });

  it("respects decimals parameter for precision", () => {
    expect(formatMeasurement(22.567, "kg/m²", 2)).toBe("22,57 kg/m²");
  });

  it("pads zeros when decimals forces fixed precision", () => {
    expect(formatMeasurement(22, "kg/m²", 2)).toBe("22,00 kg/m²");
  });

  it("rounds to max 2 decimals when no decimals param given", () => {
    expect(formatMeasurement(3.14159)).toBe("3,14");
  });

  it("handles zero correctly (not treated as null/undefined)", () => {
    expect(formatMeasurement(0, "kg")).toBe("0 kg");
  });

  it("handles negative values", () => {
    expect(formatMeasurement(-5.5, "°C")).toBe("-5,5 °C");
  });

  it("decimals=0 rounds to integer and formats without comma", () => {
    expect(formatMeasurement(22.7, "kg/m²", 0)).toBe("23 kg/m²");
  });
});
