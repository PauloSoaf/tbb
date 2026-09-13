import { z } from "zod";

export const substitutionGroupTypeSchema = z.enum(["ITEM_REPLACEMENT", "MEAL_OPTION"]);
export const equivalenceBasisSchema = z.enum(["CALORIES", "MACROS", "CARBS", "PROTEIN", "FAT", "PORTION", "FOOD_GROUP", "MANUAL"]);
export const substitutionItemSourceSchema = z.enum(["TACO", "CUSTOM"]);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().nullable().optional(),
);

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().finite().positive().optional(),
);

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().finite().min(0).optional(),
);

export const createSubstitutionGroupSchema = z.object({
  mealPlanId: z.string().min(1),
  mealId: optionalText,
  baseMealItemId: optionalText,
  type: substitutionGroupTypeSchema.default("ITEM_REPLACEMENT"),
  title: z.string().trim().min(1),
  description: optionalText,
  equivalenceBasis: equivalenceBasisSchema.default("MANUAL"),
  targetCalories: optionalNonNegativeNumber,
  targetProtein: optionalNonNegativeNumber,
  targetCarbs: optionalNonNegativeNumber,
  targetFat: optionalNonNegativeNumber,
  targetQuantity: optionalPositiveNumber,
  targetUnit: optionalText,
  visibleToPatient: z.boolean().default(true),
  notes: optionalText,
  position: z.number().int().min(0).default(0),
});

export const updateSubstitutionGroupSchema = createSubstitutionGroupSchema.partial().extend({
  id: z.string().min(1),
});

export const createSubstitutionItemSchema = z.object({
  groupId: z.string().min(1),
  foodName: z.string().trim().min(1),
  source: substitutionItemSourceSchema.default("CUSTOM"),
  tacoFoodId: optionalText,
  quantity: optionalPositiveNumber,
  unit: optionalText,
  householdMeasure: optionalText,
  calories: optionalNonNegativeNumber,
  protein: optionalNonNegativeNumber,
  carbs: optionalNonNegativeNumber,
  fat: optionalNonNegativeNumber,
  fiber: optionalNonNegativeNumber,
  sodium: optionalNonNegativeNumber,
  equivalenceNotes: optionalText,
  position: z.number().int().min(0).default(0),
});

export const updateSubstitutionItemSchema = createSubstitutionItemSchema.partial().extend({
  id: z.string().min(1),
});

export const reorderSubstitutionItemsSchema = z.object({
  groupId: z.string().min(1),
  itemIds: z.array(z.string().min(1)),
});

export const suggestEquivalentPortionSchema = z.object({
  basis: equivalenceBasisSchema,
  baseItem: z.object({
    calories: optionalNonNegativeNumber,
    protein: optionalNonNegativeNumber,
    carbs: optionalNonNegativeNumber,
    fat: optionalNonNegativeNumber,
  }),
  candidateFood: z.object({
    kcal: optionalNonNegativeNumber,
    calories: optionalNonNegativeNumber,
    protein: optionalNonNegativeNumber,
    carbohydrate: optionalNonNegativeNumber,
    carbs: optionalNonNegativeNumber,
    lipid: optionalNonNegativeNumber,
    fat: optionalNonNegativeNumber,
    fiber: optionalNonNegativeNumber,
    sodium: optionalNonNegativeNumber,
  }),
});

export type CreateSubstitutionGroupInput = z.infer<typeof createSubstitutionGroupSchema>;
export type UpdateSubstitutionGroupInput = z.infer<typeof updateSubstitutionGroupSchema>;
export type CreateSubstitutionItemInput = z.infer<typeof createSubstitutionItemSchema>;
export type UpdateSubstitutionItemInput = z.infer<typeof updateSubstitutionItemSchema>;
export type ReorderSubstitutionItemsInput = z.infer<typeof reorderSubstitutionItemsSchema>;
export type SuggestEquivalentPortionInput = z.infer<typeof suggestEquivalentPortionSchema>;
