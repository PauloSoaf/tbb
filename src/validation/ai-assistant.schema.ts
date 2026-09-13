import { z } from "zod";

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1200),
});

export const aiAssistantMessageSchema = z.object({
  message: z.string().trim().min(1, "Digite uma pergunta.").max(1200, "Pergunta muito longa."),
  tenant: z.string().trim().min(1),
  currentPath: z.string().trim().max(300).optional(),
  patientId: z.string().trim().max(80).optional().nullable(),
  history: z.array(historyItemSchema).max(10).optional(),
});

export type AIAssistantMessageInput = z.infer<typeof aiAssistantMessageSchema>;

export function sanitizeAssistantText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}
