import { z } from "zod";
import { MealPlanStatus, MealItemSource } from "@prisma/client";

export const createMealPlanSchema = z.object({
  patientId: z.string().optional(),
  isTemplate: z.boolean().default(false),
  title: z.string().min(1, "Título é obrigatório"),
  objective: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  status: z.nativeEnum(MealPlanStatus).default("DRAFT"),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  targetCalories: z.number().nonnegative().optional(),
});

export const updateMealPlanSchema = createMealPlanSchema.partial().extend({
  patientId: z.string().optional(),
});

export const createMealSchema = z.object({
  mealPlanId: z.string().min(1, "Plano Alimentar é obrigatório"),
  name: z.string().min(1, "Nome da refeição é obrigatório"),
  time: z.string().optional().or(z.literal("")),
  position: z.number().int().nonnegative().default(0),
  notes: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
});

export const updateMealSchema = createMealSchema.partial().extend({
  mealPlanId: z.string().optional(),
});

const baseMealItemSchema = z.object({
  mealId: z.string().min(1, "Refeição é obrigatória"),
  foodName: z.string().min(1, "Nome do alimento é obrigatório"),
  source: z.nativeEnum(MealItemSource),
  tacoFoodId: z.string().optional().or(z.literal("")),
  quantity: z.number().positive("A quantidade deve ser maior que zero"),
  unit: z.string().min(1, "A unidade é obrigatória"),
  householdMeasure: z.string().optional().or(z.literal("")),
  calories: z.number().nonnegative("Calorias não podem ser negativas").default(0),
  protein: z.number().nonnegative("Proteínas não podem ser negativas").default(0),
  carbs: z.number().nonnegative("Carboidratos não podem ser negativos").default(0),
  fat: z.number().nonnegative("Gorduras não podem ser negativas").default(0),
  fiber: z.number().nonnegative("Fibras não podem ser negativas").optional(),
  sodium: z.number().nonnegative("Sódio não pode ser negativo").optional(),
  notes: z.string().optional().or(z.literal("")),
  position: z.number().int().nonnegative().default(0),
});

export const createMealItemSchema = baseMealItemSchema.refine(
  (data) => {
    if (data.source === "TACO" && !data.tacoFoodId) {
      return false;
    }
    return true;
  },
  {
    message: "Alimentos da TACO precisam de um ID válido da base.",
    path: ["tacoFoodId"],
  }
);

export const updateMealItemSchema = baseMealItemSchema.partial().extend({
  mealId: z.string().optional(),
});

export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type CreateMealItemInput = z.infer<typeof createMealItemSchema>;
export type UpdateMealItemInput = z.infer<typeof updateMealItemSchema>;
