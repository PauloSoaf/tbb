import { describe, it, expect } from "vitest";
import { patientSchema } from "@/validation/patient.schema";

describe("patientSchema", () => {
  const validBase = {
    name: "João Oliveira",
    phone: "11988887777",
  };

  it("parses valid minimal patient", () => {
    const result = patientSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = patientSchema.safeParse({ ...validBase, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires phone", () => {
    const result = patientSchema.safeParse({ ...validBase, phone: "" });
    expect(result.success).toBe(false);
  });

  it("validates email format when provided", () => {
    const result = patientSchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("allows empty string email (optional)", () => {
    const result = patientSchema.safeParse({ ...validBase, email: "" });
    expect(result.success).toBe(true);
  });

  it("allows omitting email entirely", () => {
    const result = patientSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("validates weight as positive number when provided", () => {
    const result = patientSchema.safeParse({ ...validBase, weight: "-5" });
    expect(result.success).toBe(false);
  });

  it("allows weight as positive number string", () => {
    const result = patientSchema.safeParse({ ...validBase, weight: "65.5" });
    expect(result.success).toBe(true);
  });

  it("validates height as positive number when provided", () => {
    const result = patientSchema.safeParse({ ...validBase, height: "0" });
    expect(result.success).toBe(false);
  });

  it("allows all optional fields", () => {
    const result = patientSchema.safeParse({
      ...validBase,
      email: "joao@example.com",
      birthDate: "1985-05-15",
      gender: "M",
      weight: "80",
      height: "178",
      goal: "Perda de peso",
      notes: "Paciente com histórico de hipertensão",
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const result = patientSchema.safeParse({ ...validBase, status: "INVALID_STATUS" });
    expect(result.success).toBe(false);
  });

  it("allows valid status ARCHIVED", () => {
    const result = patientSchema.safeParse({ ...validBase, status: "ARCHIVED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid gender value", () => {
    const result = patientSchema.safeParse({ ...validBase, gender: "INVALID" });
    expect(result.success).toBe(false);
  });
});
