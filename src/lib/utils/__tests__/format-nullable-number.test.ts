import { describe, it, expect } from "vitest";
import { formatNullableNumber } from "../format-nullable-number";

describe("formatNullableNumber", () => {
  it("returns 'Sem dado' for null", () => {
    expect(formatNullableNumber(null)).toBe("Sem dado");
  });

  it("returns 'Sem dado' for undefined", () => {
    expect(formatNullableNumber(undefined)).toBe("Sem dado");
  });

  it("formats number to 1 decimal place", () => {
    expect(formatNullableNumber(22.37)).toBe("22.4");
    expect(formatNullableNumber(80)).toBe("80");
    expect(formatNullableNumber(1.5)).toBe("1.5");
  });

  it("appends suffix when provided", () => {
    expect(formatNullableNumber(75.5, " kg")).toBe("75.5 kg");
    expect(formatNullableNumber(25.3, "%")).toBe("25.3%");
  });

  it("no suffix by default", () => {
    expect(formatNullableNumber(100)).toBe("100");
  });

  it("removes trailing zero from 1 decimal", () => {
    expect(formatNullableNumber(70.0)).toBe("70");
  });

  it("rounds to 1 decimal place", () => {
    expect(formatNullableNumber(22.34)).toBe("22.3");
    expect(formatNullableNumber(22.35)).toBe("22.4");
  });

  it("works with zero", () => {
    expect(formatNullableNumber(0)).toBe("0");
    expect(formatNullableNumber(0, " kg")).toBe("0 kg");
  });

  it("works with negative numbers", () => {
    expect(formatNullableNumber(-1.5, " kg")).toBe("-1.5 kg");
  });
});
