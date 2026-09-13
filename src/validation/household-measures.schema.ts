import { z } from "zod";
import {
  HOUSEHOLD_MEASURE_CONFIDENCES,
  HOUSEHOLD_MEASURE_SOURCES,
  HOUSEHOLD_MEASURE_SIZES,
  HOUSEHOLD_MEASURE_TYPES,
} from "@/lib/utils/household-measures";

const finitePositiveNumber = z
  .number()
  .refine((value) => Number.isFinite(value) && !Number.isNaN(value), "Valor numerico invalido")
  .positive("O valor deve ser maior que zero");

const foodIdentityBase = z.object({
  tacoFoodId: z.string().trim().optional().or(z.literal("")),
  foodName: z.string().trim().optional().or(z.literal("")),
});

const optionalFoodIdentity = foodIdentityBase
  .refine((data) => Boolean(data.tacoFoodId || data.foodName), {
    message: "Informe um alimento TACO ou nome de alimento.",
    path: ["foodName"],
  });

export const searchHouseholdMeasuresSchema = optionalFoodIdentity;

export const convertGramsToHouseholdMeasuresSchema = optionalFoodIdentity.extend({
  grams: finitePositiveNumber,
});

export const convertHouseholdMeasureToGramsSchema = optionalFoodIdentity.extend({
  measureId: z.string().min(1, "Medida obrigatoria"),
  quantity: finitePositiveNumber,
});

export const createCustomHouseholdMeasureSchema = optionalFoodIdentity.extend({
  nutritionistId: z.string().min(1, "Nutricionista obrigatorio"),
  measureName: z.string().min(1, "Nome da medida obrigatorio"),
  grams: finitePositiveNumber,
  type: z.enum(HOUSEHOLD_MEASURE_TYPES).default("CUSTOM"),
  size: z.enum(HOUSEHOLD_MEASURE_SIZES).default("CUSTOM"),
  source: z.enum(HOUSEHOLD_MEASURE_SOURCES).default("NUTRITIONIST_CUSTOM"),
  confidence: z.enum(HOUSEHOLD_MEASURE_CONFIDENCES).default("LOW"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const updateCustomHouseholdMeasureSchema = foodIdentityBase
  .partial()
  .extend({
    id: z.string().min(1, "Medida obrigatoria"),
    nutritionistId: z.string().min(1, "Nutricionista obrigatorio"),
    measureName: z.string().min(1, "Nome da medida obrigatorio").optional(),
    grams: finitePositiveNumber.optional(),
    type: z.enum(HOUSEHOLD_MEASURE_TYPES).optional(),
    size: z.enum(HOUSEHOLD_MEASURE_SIZES).optional(),
    source: z.enum(HOUSEHOLD_MEASURE_SOURCES).optional(),
    confidence: z.enum(HOUSEHOLD_MEASURE_CONFIDENCES).optional(),
    notes: z.string().trim().optional().or(z.literal("")),
  });

export type SearchHouseholdMeasuresInput = z.infer<typeof searchHouseholdMeasuresSchema>;
export type ConvertGramsToHouseholdMeasuresInput = z.infer<typeof convertGramsToHouseholdMeasuresSchema>;
export type ConvertHouseholdMeasureToGramsInput = z.infer<typeof convertHouseholdMeasureToGramsSchema>;
export type CreateCustomHouseholdMeasureInput = z.infer<typeof createCustomHouseholdMeasureSchema>;
export type UpdateCustomHouseholdMeasureInput = z.infer<typeof updateCustomHouseholdMeasureSchema>;
