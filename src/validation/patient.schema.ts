import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.enum(["F", "M", "O"]).optional().or(z.literal("")),
  weight: z.coerce.number().positive("Peso deve ser positivo").optional().or(z.literal("")),
  height: z.coerce.number().positive("Altura deve ser positiva").optional().or(z.literal("")),
  goal: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;

