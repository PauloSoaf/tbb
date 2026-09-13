import { describe, it, expect } from "vitest";
import { nutritionistConfigSchema } from "@/validation/nutritionist.schema";

describe("nutritionistConfigSchema", () => {
  const validBase = {
    name: "Dra. Fabíola Amorim",
    crn: "CRN-7 00001",
    email: "fabiola@nutriopus.com",
    city: "Manaus",
    state: "AM",
  };

  it("should validate a complete valid config", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      bio: "Nutricionista especializada em emagrecimento.",
      whatsapp: "5592999999999",
      clinicAddress: "Av. Eduardo Ribeiro, 520",
      profileImageUrl: "https://example.com/foto.jpg",
      themePrimaryColor: "#2563EB",
      specialtiesRaw: "Emagrecimento, Saúde intestinal",
    });
    expect(result.success).toBe(true);
  });

  it("should validate with only required fields", () => {
    const result = nutritionistConfigSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("should require name", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome é obrigatório");
    }
  });

  it("should require crn", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      crn: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("CRN é obrigatório");
    }
  });

  it("should require a valid email", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("E-mail público inválido");
    }
  });

  it("should require city", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      city: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Cidade é obrigatória");
    }
  });

  it("should require state with exactly 2 characters", () => {
    const tooLong = nutritionistConfigSchema.safeParse({
      ...validBase,
      state: "SAO",
    });
    expect(tooLong.success).toBe(false);
  });

  it("should reject state with 1 character", () => {
    const tooShort = nutritionistConfigSchema.safeParse({
      ...validBase,
      state: "S",
    });
    expect(tooShort.success).toBe(false);
  });

  it("should accept state with exactly 2 characters", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      state: "SP",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid hex color", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      themePrimaryColor: "2563EB", // missing #
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Cor inválida");
    }
  });

  it("should accept valid hex color", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      themePrimaryColor: "#1D4ED8",
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty themePrimaryColor", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      themePrimaryColor: "",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid profileImageUrl", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      profileImageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should accept empty profileImageUrl", () => {
    const result = nutritionistConfigSchema.safeParse({
      ...validBase,
      profileImageUrl: "",
    });
    expect(result.success).toBe(true);
  });
});
