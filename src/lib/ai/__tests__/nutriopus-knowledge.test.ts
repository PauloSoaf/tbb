import { describe, expect, it } from "vitest";
import { NUTRIOPUS_KNOWLEDGE, FLOATING_TOOLS_KNOWLEDGE, getKnowledgeForPrompt } from "../nutriopus-knowledge";

describe("NUTRIOPUS_KNOWLEDGE", () => {
  it("contains 12 entries", () => {
    expect(NUTRIOPUS_KNOWLEDGE).toHaveLength(12);
  });

  it("every entry has id, title, description, keywords array, and href function", () => {
    for (const item of NUTRIOPUS_KNOWLEDGE) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.title).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(Array.isArray(item.keywords)).toBe(true);
      expect(item.keywords.length).toBeGreaterThan(0);
      expect(typeof item.href).toBe("function");
    }
  });

  it("href function generates tenant-scoped paths", () => {
    const dashboard = NUTRIOPUS_KNOWLEDGE.find((k) => k.id === "dashboard")!;
    expect(dashboard.href("minha-clinica")).toBe("/dashboard/minha-clinica");
  });

  it("includes the 4 modules added in sprint AANT", () => {
    const ids = NUTRIOPUS_KNOWLEDGE.map((k) => k.id);
    expect(ids).toContain("team");
    expect(ids).toContain("clinic-report");
    expect(ids).toContain("calculadoras");
    expect(ids).toContain("comparar-pacientes");
  });

  it("all hrefs are tenant-specific (contain the tenant slug)", () => {
    for (const item of NUTRIOPUS_KNOWLEDGE) {
      expect(item.href("tenant-xyz")).toContain("tenant-xyz");
    }
  });
});

describe("FLOATING_TOOLS_KNOWLEDGE", () => {
  it("contains exactly 5 tools", () => {
    expect(FLOATING_TOOLS_KNOWLEDGE).toHaveLength(5);
  });

  it("includes all 5 floating tool IDs", () => {
    const ids = FLOATING_TOOLS_KNOWLEDGE.map((t) => t.id);
    expect(ids).toContain("taco");
    expect(ids).toContain("bmi");
    expect(ids).toContain("macros");
    expect(ids).toContain("water");
    expect(ids).toContain("tmb");
  });
});

describe("getKnowledgeForPrompt", () => {
  it("returns modulos and ferramentasFlutuantes", () => {
    const result = getKnowledgeForPrompt("minha-clinica");
    expect(result).toHaveProperty("modulos");
    expect(result).toHaveProperty("ferramentasFlutuantes");
  });

  it("modulos contains rota field resolved for the tenant", () => {
    const result = getKnowledgeForPrompt("minha-clinica");
    const dashboard = result.modulos.find((m) => m.id === "dashboard")!;
    expect(dashboard.rota).toBe("/dashboard/minha-clinica");
  });

  it("modulos count matches NUTRIOPUS_KNOWLEDGE length", () => {
    const result = getKnowledgeForPrompt("t");
    expect(result.modulos).toHaveLength(NUTRIOPUS_KNOWLEDGE.length);
  });

  it("each modulo has id, titulo, descricao, rota", () => {
    const result = getKnowledgeForPrompt("t");
    for (const m of result.modulos) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.titulo).toBe("string");
      expect(typeof m.descricao).toBe("string");
      expect(typeof m.rota).toBe("string");
    }
  });
});
