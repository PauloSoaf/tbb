import { describe, it, expect } from "vitest";
import { generateAnamneseSummary } from "@/lib/utils/generateAnamneseSummary";

describe("generateAnamneseSummary", () => {
  it("returns a string starting with patient name", () => {
    const result = generateAnamneseSummary({ name: "Maria Silva" });
    expect(result).toContain("Maria Silva");
  });

  it("uses 'Paciente' when name is not provided", () => {
    const result = generateAnamneseSummary({});
    expect(result).toContain("Paciente");
  });

  it("includes goal when present", () => {
    const result = generateAnamneseSummary({ name: "Ana", goal: "Emagrecer" });
    expect(result).toContain("Emagrecer");
  });

  it("includes BMI classification when weight and height are provided", () => {
    const result = generateAnamneseSummary({ name: "Ana", weight: "70", height: "1.75" });
    expect(result).toContain("IMC:");
    expect(result).toContain("Peso normal");
  });

  it("includes diseases in summary", () => {
    const result = generateAnamneseSummary({ diseases: "Diabetes tipo 2" });
    expect(result).toContain("Diabetes tipo 2");
  });

  it("includes medications in summary", () => {
    const result = generateAnamneseSummary({ medications: "Metformina" });
    expect(result).toContain("Metformina");
  });

  it("includes allergies in summary", () => {
    const result = generateAnamneseSummary({ allergies: "Amendoim" });
    expect(result).toContain("Amendoim");
  });

  it("includes sleep habits in summary", () => {
    const result = generateAnamneseSummary({ sleepHabits: "Dorme mal, insônia" });
    expect(result).toContain("Dorme mal");
  });

  it("generates multi-field summary as a complete sentence", () => {
    const result = generateAnamneseSummary({
      name: "João",
      goal: "Ganho de massa",
      weight: "80",
      height: "1.80",
      allergies: "Nozes",
    });
    expect(result).toContain("João");
    expect(result).toContain("Ganho de massa");
    expect(result).toContain("Nozes");
  });

  it("returns a non-empty string for empty payload", () => {
    const result = generateAnamneseSummary({});
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes intolerances when present", () => {
    const result = generateAnamneseSummary({ intolerances: "Lactose" });
    expect(result).toContain("Intolerâncias: Lactose");
  });

  it("includes dietaryRestrictions when present", () => {
    const result = generateAnamneseSummary({ dietaryRestrictions: "Sem glúten" });
    expect(result).toContain("Restrições alimentares: Sem glúten");
  });

  it("includes symptoms when present", () => {
    const result = generateAnamneseSummary({ symptoms: "Cansaço frequente" });
    expect(result).toContain("Sintomas relatados: Cansaço frequente");
  });

  it("includes gutHealth when present", () => {
    const result = generateAnamneseSummary({ gutHealth: "Constipação" });
    expect(result).toContain("Intestino: Constipação");
  });

  it("omits BMI when only weight is provided (no height)", () => {
    const result = generateAnamneseSummary({ weight: "70" });
    expect(result).not.toContain("IMC");
  });
});
