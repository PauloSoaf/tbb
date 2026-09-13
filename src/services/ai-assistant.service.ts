import { buildAIAssistantMessages } from "@/lib/ai/build-messages";
import type { ConversationHistoryItem } from "@/lib/ai/build-messages";
import type { AIAssistantAction } from "@/lib/ai/ai-actions";

export type { ConversationHistoryItem };

export type AIAssistantResult = {
  ok: boolean;
  text: string;
  provider: string;
  actions: AIAssistantAction[];
  configurationRequired?: boolean;
};

export async function askAIAssistant({
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
}): Promise<AIAssistantResult> {
  const built = await buildAIAssistantMessages({
    nutritionistId,
    tenant,
    message,
    currentPath,
    patientId,
    history,
  });

  if (!built.ok) {
    return {
      ok: false,
      provider: built.providerName,
      configurationRequired: true,
      actions: built.actions,
      text: "A IA do NutriOpus ainda nao esta configurada neste ambiente. O padrao gratuito e local e Ollama: deixe AI_PROVIDER=ollama e rode o Ollama com um modelo instalado.",
    };
  }

  try {
    const response = await built.provider.generate(built.messages);
    return {
      ok: true,
      provider: built.provider.name,
      text: response.text || "Nao recebi uma resposta do provider configurado. Tente novamente.",
      actions: built.actions,
    };
  } catch {
    return {
      ok: false,
      provider: built.provider.name,
      actions: built.actions,
      text: "Nao consegui contatar o Ollama local agora. Verifique se o Ollama esta aberto e se existe algum modelo instalado.",
    };
  }
}
