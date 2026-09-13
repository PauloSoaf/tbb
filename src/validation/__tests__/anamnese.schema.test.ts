import { describe, it, expect } from "vitest";
import { anamneseSchema } from "@/validation/anamnese.schema";

describe("anamneseSchema", () => {
  const validBase = {
    name: "Maria da Silva",
    phone: "11999999999",
    goal: "Emagrecer",
    lgpdConsent: "true",
  };

  it("parses a valid minimal payload", () => {
    const result = anamneseSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = anamneseSchema.safeParse({ ...validBase, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires phone", () => {
    const result = anamneseSchema.safeParse({ ...validBase, phone: "" });
    expect(result.success).toBe(false);
  });

  it("requires goal", () => {
    const result = anamneseSchema.safeParse({ ...validBase, goal: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when lgpdConsent is not 'true'", () => {
    const result = anamneseSchema.safeParse({ ...validBase, lgpdConsent: "false" });
    expect(result.success).toBe(false);
  });

  it("rejects when lgpdConsent is missing", () => {
    const { lgpdConsent, ...noConsent } = validBase;
    void lgpdConsent;
    const result = anamneseSchema.safeParse(noConsent);
    expect(result.success).toBe(false);
  });

  it("validates email format when provided", () => {
    const result = anamneseSchema.safeParse({ ...validBase, email: "invalid" });
    expect(result.success).toBe(false);
  });

  it("allows empty email", () => {
    const result = anamneseSchema.safeParse({ ...validBase, email: "" });
    expect(result.success).toBe(true);
  });

  it("allows optional fields to be missing", () => {
    const result = anamneseSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("parses full payload correctly", () => {
    const full = {
      ...validBase,
      email: "maria@example.com",
      birthDate: "1990-01-15",
      weight: "65",
      height: "165",
      diseases: "Nenhuma",
      surgeries: "",
      medications: "",
      familyHistory: "Diabetes",
      dietaryRoutine: "3 refeições por dia",
      mealTimes: "8h, 13h, 19h",
      sleepHabits: "Dorme 7h",
      gutHealth: "Normal",
      symptoms: "",
      allergies: "",
      intolerances: "",
      dietaryRestrictions: "",
    };
    const result = anamneseSchema.safeParse(full);
    expect(result.success).toBe(true);
  });
});
