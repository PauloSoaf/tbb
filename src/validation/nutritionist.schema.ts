import { z } from "zod";

export const nutritionistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hifens"),
  crn: z.string().min(1, "CRN é obrigatório"),
  bio: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido"),
  clinicAddress: z.string().optional(),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório").max(2, "Use a sigla do estado"),
  specialties: z.array(z.string()).optional(),
});

export type NutritionistInput = z.infer<typeof nutritionistSchema>;

/**
 * Schema para configurações da página pública (sem slug, que não é editável via UI)
 */
export const nutritionistConfigSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  crn: z.string().min(1, "CRN é obrigatório"),
  bio: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail público inválido"),
  clinicAddress: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado inválido").max(2, "Use a sigla do estado (ex: SP)"),
  profileImageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  themePrimaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (ex: #2563EB)")
    .optional()
    .or(z.literal("")),
  // Especialidades como string separada por vírgulas, serializada no action
  specialtiesRaw: z.string().optional().or(z.literal("")),
});

export type NutritionistConfigInput = z.infer<typeof nutritionistConfigSchema>;

