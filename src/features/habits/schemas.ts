import { z } from "zod";
import { isDateKey } from "@/lib/dates";

const date = z.string().refine(isDateKey, "Informe uma data válida.");
export const habitSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do hábito.").max(100),
  description: z.string().trim().max(2000).default(""),
  icon: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/, "Cor inválida."),
  type: z.enum(["BOOLEAN", "QUANTITY", "DURATION", "PAGES", "DISTANCE", "MONEY", "CUSTOM"]),
  target: z.coerce.number().positive("A meta deve ser maior que zero.").max(1_000_000_000),
  unit: z.string().trim().min(1, "Informe a unidade.").max(30),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  startDate: date,
  endDate: z.union([date, z.literal("")]).default(""),
  days: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Escolha pelo menos um dia da semana."),
  time: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.").default(""),
  monthlyDay: z.union([z.literal(""), z.coerce.number().int().min(1).max(31)]).default(""),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, { message: "O fim deve ser igual ou posterior ao início.", path: ["endDate"] });

export const entrySchema = z.object({
  habitId: z.string().min(1),
  date,
  operation: z.enum(["set", "increment", "decrement", "complete", "undo"]),
  value: z.coerce.number().min(0).max(1_000_000_000).default(0),
  note: z.string().max(2000).optional(),
});
