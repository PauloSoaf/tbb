export type LibraryMealItemSource = "TACO" | "CUSTOM";
export type LibraryImageFit = "COVER" | "CONTAIN";
export type LibraryImageAlignment = "LEFT" | "CENTER" | "RIGHT";
export type LibraryImageLayer = "INLINE" | "BEHIND" | "FRONT";
export type LibraryFoodImagePlacement = "SIDE" | "ABOVE" | "BELOW";

export interface MealPlanLibraryFoodSnapshot {
  foodName: string;
  source: LibraryMealItemSource;
  tacoFoodId?: string | null;
  quantity: number;
  unit: string;
  householdMeasure?: string | null;
  householdMeasureSource?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sodium?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  showImageInPdf?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  imageFit?: LibraryImageFit;
  imageAlignment?: LibraryImageAlignment;
  imageLayer?: LibraryImageLayer;
  imageX?: number;
  imageY?: number;
  imagePlacement?: LibraryFoodImagePlacement;
}

export interface MealPlanLibraryMealSnapshot {
  name: string;
  time?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  showImageInPdf?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  imageFit?: LibraryImageFit;
  imageAlignment?: LibraryImageAlignment;
  imageLayer?: LibraryImageLayer;
  imageX?: number;
  imageY?: number;
  items: Array<MealPlanLibraryFoodSnapshot & { position?: number }>;
}

export interface SavedMealPlanLibraryFood extends MealPlanLibraryFoodSnapshot {
  id: string;
  timesUsed: number;
  updatedAt: string;
}

export interface SavedMealPlanLibraryMeal extends MealPlanLibraryMealSnapshot {
  id: string;
  timesUsed: number;
  updatedAt: string;
}

export interface MealPlanLibraryData {
  meals: SavedMealPlanLibraryMeal[];
  foods: SavedMealPlanLibraryFood[];
}

export type MealPlanLibraryDragPayload =
  | { type: "meal-plan-library-food"; food: SavedMealPlanLibraryFood }
  | { type: "meal-plan-library-meal"; meal: SavedMealPlanLibraryMeal };

