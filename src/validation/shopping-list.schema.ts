/**
 * shopping-list.schema.ts
 * Zod schemas for shopping list validation.
 */

import { z } from "zod";

export const generateShoppingListSchema = z.object({
  mealPlanId: z.string().min(1, "Plano alimentar e obrigatorio."),
  periodDays: z
    .number()
    .int("Periodo deve ser inteiro.")
    .min(1, "Periodo minimo e 1 dia.")
    .max(30, "Periodo maximo e 30 dias."),
  title: z.string().max(200).optional(),
});

export const createShoppingListSchema = z.object({
  mealPlanId: z.string().optional(),
  title: z.string().min(1, "Titulo e obrigatorio.").max(200),
  periodDays: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(7),
  notes: z.string().max(1000).optional(),
  generatedFromPlan: z.boolean().default(true),
});

export const updateShoppingListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
  periodDays: z.number().int().min(1).max(30).optional(),
});

export const createShoppingListItemSchema = z
  .object({
    name: z.string().min(1, "Nome do item e obrigatorio.").max(200),
    category: z
      .enum([
        "FRUITS",
        "VEGETABLES",
        "PROTEINS",
        "GRAINS",
        "DAIRY",
        "LEGUMES",
        "OILS",
        "SEASONINGS",
        "BEVERAGES",
        "SUPPLEMENTS",
        "OTHER",
      ])
      .default("OTHER"),
    quantity: z
      .number()
      .positive("Quantidade deve ser positiva.")
      .optional()
      .nullable(),
    unit: z.string().max(50).optional().nullable(),
    householdMeasure: z.string().max(100).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    source: z.enum(["MEAL_PLAN", "MANUAL", "SUBSTITUTION"]).default("MANUAL"),
    mealItemId: z.string().optional().nullable(),
    tacoFoodId: z.string().optional().nullable(),
    position: z.number().int().min(0).default(0),
  })
  .superRefine((val, ctx) => {
    if (val.quantity !== undefined && val.quantity !== null && isNaN(val.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantidade nao pode ser NaN.",
        path: ["quantity"],
      });
    }
  });

export const updateShoppingListItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z
    .enum([
      "FRUITS",
      "VEGETABLES",
      "PROTEINS",
      "GRAINS",
      "DAIRY",
      "LEGUMES",
      "OILS",
      "SEASONINGS",
      "BEVERAGES",
      "SUPPLEMENTS",
      "OTHER",
    ])
    .optional(),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  householdMeasure: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export const toggleShoppingListItemSchema = z.object({
  checked: z.boolean(),
});

export type GenerateShoppingListInput = z.infer<typeof generateShoppingListSchema>;
export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>;
export type UpdateShoppingListInput = z.infer<typeof updateShoppingListSchema>;
export type CreateShoppingListItemInput = z.infer<typeof createShoppingListItemSchema>;
export type UpdateShoppingListItemInput = z.infer<typeof updateShoppingListItemSchema>;
export type ToggleShoppingListItemInput = z.infer<typeof toggleShoppingListItemSchema>;
