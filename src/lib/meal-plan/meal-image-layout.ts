export const MEAL_IMAGE_MIN_WIDTH = 120;
export const MEAL_IMAGE_MAX_WIDTH = 900;
export const MEAL_IMAGE_MIN_HEIGHT = 80;
export const MEAL_IMAGE_MAX_HEIGHT = 700;

export type MealImageFit = "COVER" | "CONTAIN";
export type MealImageAlignment = "LEFT" | "CENTER" | "RIGHT";
export type MealImageLayer = "INLINE" | "BEHIND" | "FRONT";
export type FoodImagePlacement = "SIDE" | "ABOVE" | "BELOW";
export const DEFAULT_FOOD_IMAGE_PLACEMENT: FoodImagePlacement = "SIDE";

export interface MealImageLayout {
  imageWidth: number;
  imageHeight: number;
  imageFit: MealImageFit;
  imageAlignment: MealImageAlignment;
  imageLayer: MealImageLayer;
  imageX: number;
  imageY: number;
}

export const DEFAULT_MEAL_IMAGE_LAYOUT: MealImageLayout = {
  imageWidth: 480,
  imageHeight: 270,
  imageFit: "COVER",
  imageAlignment: "CENTER",
  imageLayer: "INLINE",
  imageX: 24,
  imageY: 24,
};

export const DEFAULT_FOOD_IMAGE_LAYOUT: MealImageLayout = {
  ...DEFAULT_MEAL_IMAGE_LAYOUT,
  imageWidth: 200,
  imageHeight: 120,
  imageAlignment: "LEFT",
};

export const MEAL_IMAGE_PRESETS = [
  { id: "SMALL", width: 200, height: 120, labelKey: "meal_plan_clinical.images.preset_small" },
  { id: "MEDIUM", width: 360, height: 220, labelKey: "meal_plan_clinical.images.preset_medium" },
  { id: "LARGE", width: 640, height: 360, labelKey: "meal_plan_clinical.images.preset_large" },
  { id: "SQUARE", width: 360, height: 360, labelKey: "meal_plan_clinical.images.preset_square" },
  { id: "PORTRAIT", width: 300, height: 420, labelKey: "meal_plan_clinical.images.preset_portrait" },
  { id: "PANORAMA", width: 760, height: 260, labelKey: "meal_plan_clinical.images.preset_panorama" },
] as const;

export function clampMealImageDimension(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function normalizeMealImageLayout(value: Record<string, unknown>): MealImageLayout {
  return {
    imageWidth: clampMealImageDimension(
      value.imageWidth,
      MEAL_IMAGE_MIN_WIDTH,
      MEAL_IMAGE_MAX_WIDTH,
      DEFAULT_MEAL_IMAGE_LAYOUT.imageWidth,
    ),
    imageHeight: clampMealImageDimension(
      value.imageHeight,
      MEAL_IMAGE_MIN_HEIGHT,
      MEAL_IMAGE_MAX_HEIGHT,
      DEFAULT_MEAL_IMAGE_LAYOUT.imageHeight,
    ),
    imageFit: value.imageFit === "CONTAIN" ? "CONTAIN" : "COVER",
    imageAlignment: value.imageAlignment === "LEFT" || value.imageAlignment === "RIGHT"
      ? value.imageAlignment
      : "CENTER",
    imageLayer: value.imageLayer === "BEHIND" || value.imageLayer === "FRONT"
      ? value.imageLayer
      : "INLINE",
    imageX: clampMealImageCoordinate(value.imageX, DEFAULT_MEAL_IMAGE_LAYOUT.imageX),
    imageY: clampMealImageCoordinate(value.imageY, DEFAULT_MEAL_IMAGE_LAYOUT.imageY),
  };
}

export function normalizeFoodImageLayout(value: Record<string, unknown>): MealImageLayout {
  return normalizeMealImageLayout({
    ...value,
    imageWidth: value.imageWidth ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageWidth,
    imageHeight: value.imageHeight ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageHeight,
    imageAlignment: value.imageAlignment ?? DEFAULT_FOOD_IMAGE_LAYOUT.imageAlignment,
  });
}

export function clampMealImageCoordinate(value: unknown, fallback = 24) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(2000, Math.max(-2000, Math.round(parsed))) : fallback;
}

export function normalizeFoodImagePlacement(value: unknown): FoodImagePlacement {
  return value === "ABOVE" || value === "BELOW" ? value : DEFAULT_FOOD_IMAGE_PLACEMENT;
}
