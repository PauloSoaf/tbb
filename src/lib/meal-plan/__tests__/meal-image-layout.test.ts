import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEAL_IMAGE_LAYOUT,
  normalizeMealImageLayout,
} from "../meal-image-layout";

describe("normalizeMealImageLayout", () => {
  it("uses stable defaults for legacy meals", () => {
    expect(normalizeMealImageLayout({})).toEqual(DEFAULT_MEAL_IMAGE_LAYOUT);
  });

  it("keeps supported layout choices and bounds dimensions", () => {
    expect(normalizeMealImageLayout({
      imageWidth: 5000,
      imageHeight: "20",
      imageFit: "CONTAIN",
      imageAlignment: "RIGHT",
    })).toEqual({
      imageWidth: 900,
      imageHeight: 80,
      imageFit: "CONTAIN",
      imageAlignment: "RIGHT",
      imageLayer: "INLINE",
      imageX: 24,
      imageY: 24,
    });
  });
});
