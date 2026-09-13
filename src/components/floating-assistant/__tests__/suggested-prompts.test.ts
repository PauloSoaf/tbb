import { describe, expect, it } from "vitest";
import { getSuggestedPrompts, PATIENT_PROMPTS, GLOBAL_PROMPTS } from "../suggested-prompts";

describe("getSuggestedPrompts", () => {
  it("returns only GLOBAL_PROMPTS when patientId is absent", () => {
    const prompts = getSuggestedPrompts();
    expect(prompts).toEqual([...GLOBAL_PROMPTS]);
    expect(prompts).not.toContain("Resuma este paciente.");
  });

  it("returns only GLOBAL_PROMPTS when patientId is null", () => {
    const prompts = getSuggestedPrompts(null);
    expect(prompts).toEqual([...GLOBAL_PROMPTS]);
  });

  it("returns PATIENT_PROMPTS + GLOBAL_PROMPTS when patientId is provided", () => {
    const prompts = getSuggestedPrompts("patient-123");
    expect(prompts).toEqual([...PATIENT_PROMPTS, ...GLOBAL_PROMPTS]);
  });

  it("PATIENT_PROMPTS include IMC and TMB for patient context", () => {
    expect(PATIENT_PROMPTS).toContain("Calcular IMC.");
    expect(PATIENT_PROMPTS).toContain("Calcular TMB.");
    expect(PATIENT_PROMPTS).toContain("Resuma este paciente.");
  });

  it("GLOBAL_PROMPTS include agenda and TACO for any context", () => {
    expect(GLOBAL_PROMPTS).toContain("Onde vejo a agenda?");
    expect(GLOBAL_PROMPTS).toContain("Abrir Tabela TACO.");
  });
});
