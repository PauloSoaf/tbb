import type { AIProvider, AIProviderMessage, AIProviderResponse } from "./ai-provider";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b";

type OllamaTagsResponse = {
  models?: { name?: string; model?: string }[];
};

export class OllamaProvider implements AIProvider {
  name = "ollama";

  isConfigured() {
    return process.env.AI_ASSISTANT_ENABLED !== "false";
  }

  async generate(messages: AIProviderMessage[]): Promise<AIProviderResponse> {
    const baseUrl = getOllamaBaseUrl();
    const model = await resolveOllamaModel(baseUrl);
    if (!baseUrl || !model) throw new Error("Ollama provider is not configured");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama request failed: ${response.status} ${text}`.trim());
    }
    const data = await response.json() as { message?: { content?: string } };
    return { text: data.message?.content?.trim() || "" };
  }
}

function getOllamaBaseUrl() {
  return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL;
}

async function resolveOllamaModel(baseUrl: string) {
  const configuredModel = process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) return configuredModel;

    const data = await response.json() as OllamaTagsResponse;
    const localModels = data.models
      ?.map((model) => model.name || model.model)
      .filter((model): model is string => Boolean(model));

    if (!localModels?.length) return configuredModel;
    if (localModels.includes(configuredModel)) return configuredModel;

    const llamaModel = localModels.find((model) => model.toLowerCase().startsWith("llama"));
    return llamaModel ?? localModels[0] ?? configuredModel;
  } catch {
    return configuredModel;
  }
}

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";

  isConfigured() {
    return process.env.AI_ASSISTANT_ENABLED !== "false" && Boolean(process.env.AI_API_KEY && process.env.AI_MODEL);
  }

  async generate(messages: AIProviderMessage[]): Promise<AIProviderResponse> {
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    if (!apiKey || !model) throw new Error("OpenRouter provider is not configured");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return { text: data.choices?.[0]?.message?.content?.trim() || "" };
  }
}

export class GroqAssistantProvider extends OpenRouterProvider {
  name = "groq";

  isConfigured() {
    return process.env.AI_ASSISTANT_ENABLED !== "false" && Boolean((process.env.AI_API_KEY || process.env.GROQ_API_KEY) && process.env.AI_MODEL);
  }

  async generate(messages: AIProviderMessage[]): Promise<AIProviderResponse> {
    const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
    const model = process.env.AI_MODEL;
    if (!apiKey || !model) throw new Error("Groq provider is not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return { text: data.choices?.[0]?.message?.content?.trim() || "" };
  }
}

export function createAssistantProvider(): AIProvider | null {
  const provider = (process.env.AI_PROVIDER?.trim() || "ollama").toLowerCase();
  if (process.env.AI_ASSISTANT_ENABLED === "false" || provider === "disabled") return null;
  if (provider === "ollama") return new OllamaProvider();
  if (provider === "openrouter") return new OpenRouterProvider();
  if (provider === "groq") return new GroqAssistantProvider();
  return null;
}
