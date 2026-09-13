import { z } from "zod";

function parseDecimal(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number(trimmed.replace(",", "."));
}

export const manualWeightSchema = z.object({
  weight: z.preprocess(
    parseDecimal,
    z.number({ error: "Informe o peso." }).positive("Peso deve ser positivo")
  ),
  measuredAt: z.string().optional(),
  notes: z.string().max(1000, "Observacoes devem ter ate 1000 caracteres.").optional(),
});

export type ManualWeightFormData = z.infer<typeof manualWeightSchema>;
