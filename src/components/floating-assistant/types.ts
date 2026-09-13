import type { AIAssistantAction } from "@/lib/ai/ai-actions";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAssistantAction[];
  provider?: string;
  isError?: boolean;
};

export type FloatingToolId = "taco" | "portion-converter" | "bmi" | "macros" | "water" | "tmb";
