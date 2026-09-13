/**
 * Reusable starter vocabulary for free-text household measures. This remains
 * deliberately data-only: future TACO mappings or tenant-specific measures
 * can extend it without a schema migration or a change to saved drafts.
 */
export const COMMON_HOUSEHOLD_MEASURE_SUGGESTIONS = [
  { id: "unit", labelKey: "meal_plan_clinical.household_measure.suggestions.unit" },
  { id: "cup", labelKey: "meal_plan_clinical.household_measure.suggestions.cup" },
  { id: "tablespoon", labelKey: "meal_plan_clinical.household_measure.suggestions.tablespoon" },
  { id: "teaspoon", labelKey: "meal_plan_clinical.household_measure.suggestions.teaspoon" },
  { id: "slice", labelKey: "meal_plan_clinical.household_measure.suggestions.slice" },
  { id: "ladle", labelKey: "meal_plan_clinical.household_measure.suggestions.ladle" },
  { id: "portion", labelKey: "meal_plan_clinical.household_measure.suggestions.portion" },
  { id: "glass", labelKey: "meal_plan_clinical.household_measure.suggestions.glass" },
] as const;
