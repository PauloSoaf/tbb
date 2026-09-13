import { describe, expect, it } from "vitest";
import { DEFAULT_MEAL_PLAN_PDF_STYLE, parseMealPlanPdfStyle } from "../pdf-style";

describe("meal-plan pdf style", () => {
  it("uses safe defaults, including the profile-logo fallback switch", () => {
    expect(parseMealPlanPdfStyle(null)).toEqual(DEFAULT_MEAL_PLAN_PDF_STYLE);
    expect(DEFAULT_MEAL_PLAN_PDF_STYLE.showLogo).toBe(true);
  });

  it("normalizes unknown options and constrains watermark opacity", () => {
    expect(parseMealPlanPdfStyle({
      logoPosition: "INVALID",
      watermarkOpacity: 9,
      imageMode: "ALL",
      pageNumberFormat: "FRACTION",
    })).toEqual(expect.objectContaining({
      logoPosition: "LEFT",
      watermarkOpacity: 1,
      imageMode: "ALL",
      pageNumberFormat: "FRACTION",
    }));
  });
});
