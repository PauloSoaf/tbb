import { describe, expect, it } from "vitest";
import { manualWeightSchema } from "../manual-measurement.schema";

describe("manualWeightSchema", () => {
  it("accepts a positive decimal weight with comma", () => {
    const result = manualWeightSchema.safeParse({ weight: "72,4", measuredAt: "2026-07-04" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weight).toBe(72.4);
    }
  });

  it("rejects empty weight", () => {
    expect(manualWeightSchema.safeParse({ weight: "" }).success).toBe(false);
  });

  it("rejects negative weight", () => {
    expect(manualWeightSchema.safeParse({ weight: "-1" }).success).toBe(false);
  });

  it("limits notes length", () => {
    expect(manualWeightSchema.safeParse({ weight: "70", notes: "a".repeat(1001) }).success).toBe(false);
  });
});
