export type AIProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIProviderResponse = {
  text: string;
};

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  generate(messages: AIProviderMessage[]): Promise<AIProviderResponse>;
}

export function getAIProviderName() {
  if (process.env.AI_ASSISTANT_ENABLED === "false") return "disabled";
  return (process.env.AI_PROVIDER?.trim() || "ollama").toLowerCase();
}
