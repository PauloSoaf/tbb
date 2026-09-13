export type SubstitutionBasis = "CALORIES" | "MACROS" | "CARBS" | "PROTEIN" | "FAT" | "PORTION" | "FOOD_GROUP" | "MANUAL";

export type SubstitutionBaseItem = {
  id: string;
  foodName: string;
  quantity: number;
  unit: string;
  householdMeasure?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
