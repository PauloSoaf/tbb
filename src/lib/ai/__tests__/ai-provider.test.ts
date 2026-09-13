import { describe, expect, it, vi, afterEach } from "vitest";
import { getAIProviderName } from "../ai-provider";
import { createAssistantProvider, OllamaProvider, GroqAssistantProvider, OpenRouterProvider } from "../llama-provider";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAIProviderName", () => {
  it("returns 'disabled' when AI_PROVIDER is explicitly 'disabled'", () => {
    vi.stubEnv("AI_PROVIDER", "disabled");
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    expect(getAIProviderName()).toBe("disabled");
  });

  it("returns lowercase provider name when AI_PROVIDER is set", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    expect(getAIProviderName()).toBe("groq");
  });

  it("lowercases the provider name", () => {
    vi.stubEnv("AI_PROVIDER", "GROQ");
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    expect(getAIProviderName()).toBe("groq");
  });

  it("returns 'disabled' when AI_ASSISTANT_ENABLED is 'false'", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("AI_ASSISTANT_ENABLED", "false");
    expect(getAIProviderName()).toBe("disabled");
  });

  it("defaults to ollama when AI_PROVIDER is not set", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    expect(getAIProviderName()).toBe("ollama");
  });
});

describe("createAssistantProvider", () => {
  it("returns null when AI_ASSISTANT_ENABLED is 'false'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "false");
    vi.stubEnv("AI_PROVIDER", "groq");
    expect(createAssistantProvider()).toBeNull();
  });

  it("returns null when AI_PROVIDER is 'disabled'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "disabled");
    expect(createAssistantProvider()).toBeNull();
  });

  it("returns OllamaProvider when AI_PROVIDER is 'ollama'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "ollama");
    const provider = createAssistantProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider?.name).toBe("ollama");
  });

  it("returns GroqAssistantProvider when AI_PROVIDER is 'groq'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "groq");
    const provider = createAssistantProvider();
    expect(provider).toBeInstanceOf(GroqAssistantProvider);
    expect(provider?.name).toBe("groq");
  });

  it("returns OpenRouterProvider when AI_PROVIDER is 'openrouter'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "openrouter");
    const provider = createAssistantProvider();
    expect(provider).toBeInstanceOf(OpenRouterProvider);
    expect(provider?.name).toBe("openrouter");
  });

  it("returns null for unknown provider name", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_PROVIDER", "unknown-ai");
    expect(createAssistantProvider()).toBeNull();
  });
});

describe("OllamaProvider.isConfigured", () => {
  it("returns true without explicit env because Ollama has local defaults", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    vi.stubEnv("OLLAMA_MODEL", "");
    expect(new OllamaProvider().isConfigured()).toBe(true);
  });

  it("returns true with both OLLAMA_BASE_URL and OLLAMA_MODEL", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    vi.stubEnv("OLLAMA_MODEL", "llama3");
    expect(new OllamaProvider().isConfigured()).toBe(true);
  });

  it("returns false when AI_ASSISTANT_ENABLED is 'false'", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "false");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    vi.stubEnv("OLLAMA_MODEL", "llama3");
    expect(new OllamaProvider().isConfigured()).toBe(false);
  });
});

describe("GroqAssistantProvider.isConfigured", () => {
  it("returns true with AI_API_KEY and AI_MODEL", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "gsk_test");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("AI_MODEL", "llama3-8b");
    expect(new GroqAssistantProvider().isConfigured()).toBe(true);
  });

  it("returns true with GROQ_API_KEY as fallback", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk_fallback");
    vi.stubEnv("AI_MODEL", "llama3-8b");
    expect(new GroqAssistantProvider().isConfigured()).toBe(true);
  });

  it("returns false without any API key", () => {
    vi.stubEnv("AI_ASSISTANT_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("AI_MODEL", "llama3-8b");
    expect(new GroqAssistantProvider().isConfigured()).toBe(false);
  });
});
