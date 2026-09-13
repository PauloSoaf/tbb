import { PATIENT_AI_SYSTEM_PROMPT } from "@/lib/ai/patient-ai-system-prompt";
import { createAssistantProvider } from "@/lib/ai/llama-provider";
import type { ConversationHistoryItem } from "@/lib/ai/build-messages";

export type PatientAIResult = {
  ok: boolean;
  text: string;
  provider: string;
  configurationRequired?: boolean;
};

export async function askPatientAI({
  message,
  history,
}: {
  message: string;
  history?: ConversationHistoryItem[];
}): Promise<PatientAIResult> {
  const provider = createAssistantProvider();

  if (!provider || !provider.isConfigured()) {
    return {
      ok: false,
      provider: "none",
      configurationRequired: true,
      text: "O Assistente NutriOpus ainda não está disponível neste ambiente. Fale diretamente com sua nutricionista pelo Chat.",
    };
  }

  const historyMessages = (history ?? []).slice(-6).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const messages = [
    { role: "system" as const, content: PATIENT_AI_SYSTEM_PROMPT },
    ...historyMessages,
    { role: "user" as const, content: message.slice(0, 500) },
  ];

  try {
    const response = await provider.generate(messages);
    return {
      ok: true,
      provider: provider.name,
      text: response.text || "Não recebi uma resposta. Tente novamente.",
    };
  } catch {
    return {
      ok: false,
      provider: provider.name,
      text: "Não consegui conectar ao assistente agora. Tente novamente mais tarde.",
    };
  }
}
