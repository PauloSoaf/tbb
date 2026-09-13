import { NUTRIOPUS_AI_SYSTEM_PROMPT } from "./ai-system-prompt";
import { getKnowledgeForPrompt } from "./nutriopus-knowledge";
import { inferSafeActions } from "./ai-actions";
import { createAssistantProvider } from "./llama-provider";
import type { AIProvider } from "./ai-provider";
import { getAIProviderName } from "./ai-provider";
import type { AIProviderMessage } from "./ai-provider";
import type { AIAssistantAction } from "./ai-actions";
import { sanitizeAssistantText } from "@/validation/ai-assistant.schema";
import { getAIPatientContext } from "@/services/ai-patient-context.service";

export type ConversationHistoryItem = { role: "user" | "assistant"; content: string };

const MAX_HISTORY_CHARS = 800;

export type BuiltMessages = {
  messages: AIProviderMessage[];
  actions: AIAssistantAction[];
  provider: AIProvider;
  providerName: string;
};

export type BuildMessagesResult =
  | { ok: true } & BuiltMessages
  | { ok: false; reason: string; actions: AIAssistantAction[]; providerName: string };

export async function buildAIAssistantMessages({
  nutritionistId,
  tenant,
  message,
  currentPath,
  patientId,
  history,
}: {
  nutritionistId: string;
  tenant: string;
  message: string;
  currentPath?: string;
  patientId?: string | null;
  history?: ConversationHistoryItem[];
}): Promise<BuildMessagesResult> {
  const providerName = getAIProviderName();
  const provider = createAssistantProvider();
  const sanitized = sanitizeAssistantText(message);
  const actions = inferSafeActions(sanitized, tenant, patientId);

  if (!provider || !provider.isConfigured()) {
    return { ok: false, reason: "not_configured", actions, providerName };
  }

  const patientContext = patientId
    ? await getAIPatientContext({ nutritionistId, patientId })
    : null;

  const context = {
    paginaAtual: currentPath?.slice(0, 300) ?? null,
    tenant,
    modo: patientContext ? "Paciente atual" : "Sistema",
    conhecimentoSistema: getKnowledgeForPrompt(tenant),
    pacienteAtual: patientContext,
  };

  const historyMessages: AIProviderMessage[] = (history ?? []).map((item) => ({
    role: item.role,
    content: item.content.slice(0, MAX_HISTORY_CHARS),
  }));

  const messages: AIProviderMessage[] = [
    { role: "system", content: NUTRIOPUS_AI_SYSTEM_PROMPT },
    { role: "user", content: `Contexto autorizado:\n${JSON.stringify(context).slice(0, 6000)}` },
    { role: "assistant", content: "Contexto recebido. Pronto para ajudar." },
    ...historyMessages,
    { role: "user", content: sanitized },
  ];

  return { ok: true, messages, actions, provider, providerName };
}
