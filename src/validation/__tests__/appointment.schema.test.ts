import { describe, it, expect } from "vitest";
import { appointmentSchema } from "@/validation/appointment.schema";

describe("appointmentSchema", () => {
  const validBase = {
    patientId: "patient-123",
    date: "2025-06-15",
    startTime: "09:00",
    mode: "PRESENTIAL" as const,
  };

  it("should validate a complete valid appointment", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      endTime: "10:00",
      status: "SCHEDULED",
      notes: "Primeira consulta",
    });
    expect(result.success).toBe(true);
  });

  it("should apply default status SCHEDULED when not provided", () => {
    const result = appointmentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("SCHEDULED");
    }
  });

  it("should require patientId", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      patientId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Paciente é obrigatório");
    }
  });

  it("should require date", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      date: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data é obrigatória");
    }
  });

  it("should require startTime", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      startTime: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Horário de início é obrigatório");
    }
  });

  it("should reject invalid mode", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      mode: "HYBRID",
    });
    expect(result.success).toBe(false);
  });

  it("should accept ONLINE mode", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      mode: "ONLINE",
    });
    expect(result.success).toBe(true);
  });

  it("should accept PRESENTIAL mode", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      mode: "PRESENTIAL",
    });
    expect(result.success).toBe(true);
  });

  it("should accept status DONE", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      status: "DONE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("DONE");
    }
  });

  it("should accept status CANCELED", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      status: "CANCELED",
    });
    expect(result.success).toBe(true);
  });

  it("should allow optional endTime", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      endTime: "",
    });
    expect(result.success).toBe(true);
  });

  it("should allow optional notes", () => {
    const result = appointmentSchema.safeParse({
      ...validBase,
      notes: "",
    });
    expect(result.success).toBe(true);
  });
});
