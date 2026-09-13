import { describe, it, expect } from "vitest";
import { extractAttentionPoints } from "@/lib/utils/extractAttentionPoints";

describe("extractAttentionPoints", () => {
  it("returns empty array for empty payload", () => {
    expect(extractAttentionPoints({})).toEqual([]);
  });

  it("flags allergies", () => {
    const result = extractAttentionPoints({ allergies: "Amendoim" });
    expect(result).toContain("Alergias: Amendoim");
  });

  it("flags intolerances", () => {
    const result = extractAttentionPoints({ intolerances: "Lactose" });
    expect(result).toContain("Intolerâncias: Lactose");
  });

  it("flags medications", () => {
    const result = extractAttentionPoints({ medications: "Losartana 50mg" });
    expect(result).toContain("Medicações em uso: Losartana 50mg");
  });

  it("flags diseases", () => {
    const result = extractAttentionPoints({ diseases: "Hipertensão" });
    expect(result).toContain("Doenças/Histórico: Hipertensão");
  });

  it("flags symptoms", () => {
    const result = extractAttentionPoints({ symptoms: "Fadiga constante" });
    expect(result).toContain("Sintomas relatados: Fadiga constante");
  });

  it("flags irregular sleep", () => {
    const result = extractAttentionPoints({ sleepHabits: "Tenho insônia frequente" });
    expect(result.some((p) => p.includes("Sono irregular"))).toBe(true);
  });

  it("does not flag normal sleep", () => {
    const result = extractAttentionPoints({ sleepHabits: "Durmo bem, 8 horas por noite" });
    expect(result.some((p) => p.includes("Sono irregular"))).toBe(false);
  });

  it("flags gut problems", () => {
    const result = extractAttentionPoints({ gutHealth: "Tenho constipação frequente" });
    expect(result.some((p) => p.includes("Intestino irregular"))).toBe(true);
  });

  it("flags high BMI >= 30", () => {
    const result = extractAttentionPoints({ weight: "100", height: "1.70" });
    expect(result.some((p) => p.includes("IMC elevado"))).toBe(true);
  });

  it("flags low BMI < 18.5", () => {
    const result = extractAttentionPoints({ weight: "45", height: "1.70" });
    expect(result.some((p) => p.includes("IMC baixo"))).toBe(true);
  });

  it("does not flag normal BMI", () => {
    const result = extractAttentionPoints({ weight: "70", height: "1.75" });
    expect(result.some((p) => p.includes("IMC"))).toBe(false);
  });

  it("flags family history", () => {
    const result = extractAttentionPoints({ familyHistory: "Diabetes tipo 2" });
    expect(result).toContain("Histórico familiar: Diabetes tipo 2");
  });

  it("ignores whitespace-only values", () => {
    const result = extractAttentionPoints({ allergies: "   " });
    expect(result).toEqual([]);
  });

  it("multi-tenant isolation: empty fields do not raise flags", () => {
    const result = extractAttentionPoints({
      allergies: "",
      medications: "",
      diseases: "",
    });
    expect(result).toEqual([]);
  });

  it("flags gut diarreia keyword", () => {
    const result = extractAttentionPoints({ gutHealth: "Tenho diarreia frequente" });
    expect(result.some((p) => p.includes("Intestino irregular"))).toBe(true);
  });

  it("flags gut obstipação keyword", () => {
    const result = extractAttentionPoints({ gutHealth: "Sofro de obstipação" });
    expect(result.some((p) => p.includes("Intestino irregular"))).toBe(true);
  });

  it("flags gut ruim keyword", () => {
    const result = extractAttentionPoints({ gutHealth: "Intestino ruim" });
    expect(result.some((p) => p.includes("Intestino irregular"))).toBe(true);
  });

  it("flags sleep pouco keyword", () => {
    const result = extractAttentionPoints({ sleepHabits: "Durmo pouco, umas 5 horas" });
    expect(result.some((p) => p.includes("Sono irregular"))).toBe(true);
  });

  it("flags sleep ruim keyword", () => {
    const result = extractAttentionPoints({ sleepHabits: "Qualidade ruim de sono" });
    expect(result.some((p) => p.includes("Sono irregular"))).toBe(true);
  });

  it("flags sleep 'menos de 6' keyword", () => {
    const result = extractAttentionPoints({ sleepHabits: "Durmo menos de 6 horas por noite" });
    expect(result.some((p) => p.includes("Sono irregular"))).toBe(true);
  });
});
