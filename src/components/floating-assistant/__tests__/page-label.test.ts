import { describe, expect, it } from "vitest";
import { getPageLabel } from "../page-label";

describe("getPageLabel", () => {
  it("returns Dashboard for root dashboard path", () => {
    expect(getPageLabel("/dashboard/slug")).toBe("Dashboard");
  });

  it("returns Prontuário for patient root", () => {
    expect(getPageLabel("/dashboard/slug/pacientes/abc-123")).toBe("Prontuário");
  });

  it("returns Planos alimentares for patient planos path", () => {
    expect(getPageLabel("/dashboard/slug/pacientes/abc-123/planos")).toBe("Planos alimentares");
  });

  it("returns AvaliaÃ§Ãµes for patient medidas compatibility path", () => {
    expect(getPageLabel("/dashboard/slug/pacientes/abc-123/medidas")).toBe("AvaliaÃ§Ãµes");
  });

  it("returns AvaliaÃ§Ãµes for patient avaliacoes path", () => {
    expect(getPageLabel("/dashboard/slug/pacientes/abc-123/avaliacoes")).toBe("AvaliaÃ§Ãµes");
  });

  it("returns Anamneses for patient anamnese path", () => {
    expect(getPageLabel("/dashboard/slug/pacientes/abc-123/anamnese")).toBe("Anamneses");
  });

  it("returns Tabela TACO for ferramentas/taco", () => {
    expect(getPageLabel("/dashboard/slug/ferramentas/taco")).toBe("Tabela TACO");
  });

  it("returns Oficina de Planos for ferramentas/oficina-planos", () => {
    expect(getPageLabel("/dashboard/slug/ferramentas/oficina-planos")).toBe("Oficina de Planos");
  });

  it("returns Ferramentas for generic ferramentas path", () => {
    expect(getPageLabel("/dashboard/slug/ferramentas")).toBe("Ferramentas");
  });

  it("returns Agenda for agenda path", () => {
    expect(getPageLabel("/dashboard/slug/agenda")).toBe("Agenda");
  });

  it("returns Configurações for config path", () => {
    expect(getPageLabel("/dashboard/slug/config")).toBe("Configurações");
  });
});
