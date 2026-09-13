import { describe, expect, it } from "vitest";
import { aiAssistantMessageSchema, sanitizeAssistantText } from "../ai-assistant.schema";

describe("aiAssistantMessageSchema", () => {
  it("accepts a valid assistant prompt", () => {
    const result = aiAssistantMessageSchema.safeParse({
      message: "Onde vejo a agenda?",
      tenant: "teste",
      currentPath: "/dashboard/teste",
      patientId: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty prompts", () => {
    const result = aiAssistantMessageSchema.safeParse({
      message: "   ",
      tenant: "teste",
    });

    expect(result.success).toBe(false);
  });

  it("sanitizes script tags and angle brackets", () => {
    expect(sanitizeAssistantText("<script>alert(1)</script> ir para agenda")).toBe("ir para agenda");
  });

  it("accepts valid history array", () => {
    const result = aiAssistantMessageSchema.safeParse({
      message: "E a hidratação?",
      tenant: "teste",
      history: [
        { role: "user", content: "Quanto de proteína para 80kg?" },
        { role: "assistant", content: "Para 80kg, recomendo entre 128-160g de proteína por dia." },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects history with invalid role", () => {
    const result = aiAssistantMessageSchema.safeParse({
      message: "E a hidratação?",
      tenant: "teste",
      history: [{ role: "system", content: "hack attempt" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects history exceeding 10 items", () => {
    const result = aiAssistantMessageSchema.safeParse({
      message: "ok",
      tenant: "teste",
      history: Array.from({ length: 11 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` })),
    });

    expect(result.success).toBe(false);
  });
});

describe("sanitizeAssistantText", () => {
  it("removes script tags completely", () => {
    expect(sanitizeAssistantText("<script>alert(1)</script>texto")).toBe("texto");
  });

  it("removes angle brackets but keeps tag content and slashes", () => {
    expect(sanitizeAssistantText("<b>negrito</b>")).toBe("bnegrito/b");
  });

  it("collapses multiple spaces into one", () => {
    expect(sanitizeAssistantText("texto   com   espaços")).toBe("texto com espaços");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeAssistantText("  olá  ")).toBe("olá");
  });

  it("truncates to 1200 characters", () => {
    const long = "a".repeat(1500);
    expect(sanitizeAssistantText(long)).toHaveLength(1200);
  });

  it("passes plain text through unchanged (except trimming)", () => {
    expect(sanitizeAssistantText("Onde vejo a agenda?")).toBe("Onde vejo a agenda?");
  });

  it("removes multiline script tag", () => {
    const input = "<script\ntype='text/javascript'>\nalert(1)\n</script>ok";
    expect(sanitizeAssistantText(input)).toBe("ok");
  });
});
