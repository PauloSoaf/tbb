"use server";

import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { askPatientAI } from "@/services/patient-ai.service";
import type { ConversationHistoryItem } from "@/lib/ai/build-messages";

export async function askPatientAIAction(
  tenantSlug: string,
  message: string,
  history?: ConversationHistoryItem[]
) {
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenantSlug) {
    return { ok: false, text: "Sessão expirada. Faça login novamente.", provider: "none" };
  }

  const trimmed = message.trim().slice(0, 500);
  if (!trimmed) {
    return { ok: false, text: "Mensagem inválida.", provider: "none" };
  }

  return askPatientAI({ message: trimmed, history });
}
