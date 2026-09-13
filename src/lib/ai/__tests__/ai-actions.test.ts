import { describe, expect, it } from "vitest";
import { inferSafeActions, validateAssistantActions } from "../ai-actions";

describe("ai-actions", () => {
  it("infers safe dashboard navigation actions", () => {
    const actions = inferSafeActions("Onde vejo agenda e tabela taco?", "teste");

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/agenda" }),
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/ferramentas/taco" }),
      ])
    );
  });

  it("infers OPEN_TOOL actions for floating tools", () => {
    const imcActions = inferSafeActions("calcular imc do paciente", "teste");
    expect(imcActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "OPEN_TOOL", toolId: "bmi" })])
    );

    const macroActions = inferSafeActions("distribuicao de macros e proteina", "teste");
    expect(macroActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "OPEN_TOOL", toolId: "macros" })])
    );

    const waterActions = inferSafeActions("calcular agua e hidratacao", "teste");
    expect(waterActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "OPEN_TOOL", toolId: "water" })])
    );

    const tmbActions = inferSafeActions("calcular tmb e metabolismo basal", "teste");
    expect(tmbActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "OPEN_TOOL", toolId: "tmb" })])
    );
  });

  it("validates OPEN_TOOL actions (allows valid toolId, drops NONE)", () => {
    const actions = validateAssistantActions(
      [
        { type: "OPEN_TOOL", label: "Abrir IMC", toolId: "bmi" },
        { type: "OPEN_TOOL", label: "Abrir TMB", toolId: "tmb" },
        { type: "NONE" },
      ],
      "teste"
    );
    expect(actions).toEqual([
      { type: "OPEN_TOOL", label: "Abrir IMC", toolId: "bmi" },
      { type: "OPEN_TOOL", label: "Abrir TMB", toolId: "tmb" },
    ]);
  });

  it("infers OPEN_PATIENT when patientId provided and message mentions paciente", () => {
    const actions = inferSafeActions("resuma este paciente", "teste", "patient-123");
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "OPEN_PATIENT",
          patientId: "patient-123",
          href: "/dashboard/teste/pacientes/patient-123",
        }),
      ])
    );
  });

  it("does NOT infer OPEN_PATIENT when patientId is absent", () => {
    const actions = inferSafeActions("resuma este paciente", "teste");
    expect(actions.some((a) => a.type === "OPEN_PATIENT")).toBe(false);
  });

  it("drops duplicate NAVIGATE hrefs", () => {
    const actions = validateAssistantActions(
      [
        { type: "NAVIGATE", label: "Pacientes A", href: "/dashboard/teste/pacientes" },
        { type: "NAVIGATE", label: "Pacientes B", href: "/dashboard/teste/pacientes" },
      ],
      "teste"
    );
    expect(actions).toHaveLength(1);
  });

  it("drops path traversal hrefs", () => {
    const actions = validateAssistantActions(
      [{ type: "NAVIGATE", label: "hack", href: "/dashboard/teste/../outro/dados" }],
      "teste"
    );
    expect(actions).toHaveLength(0);
  });

  it("drops external or cross-tenant hrefs", () => {
    const actions = validateAssistantActions(
      [
        { type: "NAVIGATE", label: "externo", href: "https://example.com" },
        { type: "NAVIGATE", label: "outro tenant", href: "/dashboard/outro/pacientes" },
        { type: "NAVIGATE", label: "pacientes", href: "/dashboard/teste/pacientes" },
      ],
      "teste"
    );

    expect(actions).toEqual([{ type: "NAVIGATE", label: "pacientes", href: "/dashboard/teste/pacientes" }]);
  });

  it("navigates to equipe module via keyword 'equipe'", () => {
    const actions = inferSafeActions("como adicionar membro da equipe?", "teste");
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/equipe" }),
      ])
    );
  });

  it("navigates to relatorio-clinica via keyword 'relatorio'", () => {
    const actions = inferSafeActions("ver relatorio da clinica e kpi", "teste");
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/ferramentas/relatorio-clinica" }),
      ])
    );
  });

  it("navigates to calculadoras via keyword 'rcq'", () => {
    const actions = inferSafeActions("calcular rcq e cintura do paciente", "teste");
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/ferramentas/calculadoras" }),
      ])
    );
  });

  it("navigates to comparar-pacientes via keyword 'comparar'", () => {
    const actions = inferSafeActions("quero comparar dois pacientes", "teste");
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "NAVIGATE", href: "/dashboard/teste/ferramentas/comparar-pacientes" }),
      ])
    );
  });

  it("caps results at 4 actions even when many keywords match", () => {
    const actions = inferSafeActions(
      "agenda taco equipe relatorio calculadora comparar paciente prontuario",
      "teste"
    );
    expect(actions.length).toBeLessThanOrEqual(4);
  });
});
