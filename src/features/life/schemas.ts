import { z } from "zod";
import { isDateKey } from "@/lib/dates";

const text = (max: number) => z.string().trim().max(max).default("");
const optionalDay = z.string().refine((value) => !value || isDateKey(value), "Informe uma data válida.").default("");
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Informe o título da tarefa.").max(200),
  description: text(5000), projectId: text(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).default("TODO"),
  dueDate: optionalDay,
  scheduledAt: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Data e horário inválidos.").default(""),
  estimatedDuration: z.union([z.literal(""), z.coerce.number().int().positive().max(100000)]).default(""),
  tags: text(500),
});
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do projeto.").max(150), description: text(5000),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/, "Cor inválida."), icon: z.string().trim().min(1).max(8),
  status: z.enum(["ACTIVE", "PAUSED", "DONE", "ARCHIVED"]).default("ACTIVE"), startDate: optionalDay, targetDate: optionalDay,
}).refine((value) => !value.startDate || !value.targetDate || value.targetDate >= value.startDate, { message: "A entrega deve ser igual ou posterior ao início.", path: ["targetDate"] });
export const goalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da meta.").max(150), description: text(5000),
  type: z.enum(["NUMERIC", "MONEY", "BOOLEAN"]).default("NUMERIC"),
  target: z.coerce.number().positive("A meta precisa ser maior que zero.").max(1_000_000_000),
  current: z.coerce.number().min(0).max(1_000_000_000).default(0),
  unit: z.string().trim().min(1, "Informe a unidade.").max(30), targetDate: optionalDay,
  status: z.enum(["ACTIVE", "PAUSED", "ACHIEVED", "ARCHIVED"]).default("ACTIVE"),
  linkedModule: z.enum(["", "HABITS", "TASKS", "CAREER", "FINANCE"]).default(""), linkedEntityId: text(100),
}).refine((value) => Boolean(value.linkedModule) === Boolean(value.linkedEntityId), { message: "Escolha um módulo e um registro para vincular, ou deixe ambos vazios.", path: ["linkedEntityId"] });
