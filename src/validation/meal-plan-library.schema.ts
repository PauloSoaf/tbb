import { z } from "zod";

const optionalText = z.string().trim().max(5000).optional().nullable();
const optionalShortText = z.string().trim().max(255).optional().nullable();
const nonNegativeNumber = z.number().finite().nonnegative();

const imagePresentationSchema = z.object({
  imageUrl: optionalText,
  imageAlt: optionalShortText,
  imageCaption: optionalText,
  showImageInPdf: z.boolean().optional(),
  imageWidth: z.number().finite().positive().max(2000).optional(),
  imageHeight: z.number().finite().positive().max(2000).optional(),
  imageFit: z.enum(["COVER", "CONTAIN"]).optional(),
  imageAlignment: z.enum(["LEFT", "CENTER", "RIGHT"]).optional(),
  imageLayer: z.enum(["INLINE", "BEHIND", "FRONT"]).optional(),
  imageX: z.number().finite().min(-5000).max(5000).optional(),
  imageY: z.number().finite().min(-5000).max(5000).optional(),
});

export const mealPlanLibraryFoodSnapshotSchema = imagePresentationSchema.extend({
  foodName: z.string().trim().min(1).max(255),
  source: z.enum(["TACO", "CUSTOM"]),
  tacoFoodId: optionalShortText,
  quantity: z.number().finite().positive().max(100000),
  unit: z.string().trim().min(1).max(50),
  householdMeasure: optionalShortText,
  householdMeasureSource: optionalShortText,
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
  fiber: nonNegativeNumber.optional().nullable(),
  sodium: nonNegativeNumber.optional().nullable(),
  notes: optionalText,
  imagePlacement: z.enum(["SIDE", "ABOVE", "BELOW"]).optional(),
});

export const saveMealPlanLibraryFoodSchema = mealPlanLibraryFoodSnapshotSchema;

export const saveMealPlanLibraryMealSchema = imagePresentationSchema.extend({
  name: z.string().trim().min(1).max(255),
  time: optionalShortText,
  notes: optionalText,
  items: z.array(mealPlanLibraryFoodSnapshotSchema.extend({
    position: z.number().int().nonnegative().optional(),
  })).max(100),
});

export const mealPlanLibraryIdSchema = z.string().trim().min(1).max(255);

export type SaveMealPlanLibraryFoodInput = z.infer<typeof saveMealPlanLibraryFoodSchema>;
export type SaveMealPlanLibraryMealInput = z.infer<typeof saveMealPlanLibraryMealSchema>;
