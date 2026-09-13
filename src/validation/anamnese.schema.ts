import { z } from "zod";

export const anamneseSchema = z.object({
  // Step 1: Dados pessoais
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  weight: z.string().optional().or(z.literal("")),
  height: z.string().optional().or(z.literal("")),

  // Step 2: Objetivo
  goal: z.string().min(1, "Objetivo é obrigatório"),

  // Step 3: Saúde e histórico
  diseases: z.string().optional().or(z.literal("")),
  surgeries: z.string().optional().or(z.literal("")),
  medications: z.string().optional().or(z.literal("")),
  familyHistory: z.string().optional().or(z.literal("")),

  // Step 4: Rotina alimentar
  dietaryRoutine: z.string().optional().or(z.literal("")),
  mealTimes: z.string().optional().or(z.literal("")),

  // Step 5: Hábitos, sintomas e restrições
  sleepHabits: z.string().optional().or(z.literal("")),
  gutHealth: z.string().optional().or(z.literal("")),
  symptoms: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  intolerances: z.string().optional().or(z.literal("")),
  dietaryRestrictions: z.string().optional().or(z.literal("")),

  // Step 6: Consentimento
  lgpdConsent: z.literal("true", {
    message: "Você deve aceitar os termos para continuar",
  }),
});

export type AnamneseInput = z.infer<typeof anamneseSchema>;
