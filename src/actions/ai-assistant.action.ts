"use server";

import { getSessionFromCookies } from "@/lib/auth/cookies";
import { aiAssistantMessageSchema } from "@/validation/ai-assistant.schema";
import { askAIAssistant } from "@/services/ai-assistant.service";

export async function askAIAssistantAction(input: unknown) {
  const session = await getSessionFromCookies();
  if (!session) {
    return { ok: false, text: "Sessao expirada. Faca login novamente.", provider: "none", actions: [] };
  }

  const parsed = aiAssistantMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      text: parsed.error.issues[0]?.message ?? "Pergunta invalida.",
      provider: "validation",
      actions: [],
    };
  }

  if (parsed.data.tenant !== session.nutritionistSlug) {
    return { ok: false, text: "Tenant invalido para esta sessao.", provider: "security", actions: [] };
  }

  return askAIAssistant({
    nutritionistId: session.nutritionistId,
    tenant: parsed.data.tenant,
    message: parsed.data.message,
    currentPath: parsed.data.currentPath,
    patientId: parsed.data.patientId,
    history: parsed.data.history,
  });
}
