import { describe, it, expect } from "vitest";
import { routes } from "../routes";
import { back } from "../back-routes";

const T = "nutriopus";
const PID = "paulo-amorim";
const SID = "session-abc";

describe("routes — dashboard", () => {
  it("builds dashboard href", () => expect(routes.dashboard(T)).toBe("/dashboard/nutriopus"));
  it("builds patients href", () => expect(routes.patients(T)).toBe("/dashboard/nutriopus/pacientes"));
  it("builds patient href", () => expect(routes.patient(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim"));
  it("builds patientRelatorio", () => expect(routes.patientRelatorio(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim/relatorio"));
  it("builds patientMedidas", () => expect(routes.patientMedidas(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim/medidas"));
  it("builds patientPlanos", () => expect(routes.patientPlanos(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim/planos"));
  it("builds careSessions", () => expect(routes.careSessions(T)).toBe("/dashboard/nutriopus/atendimentos"));
  it("builds careSession detail", () => expect(routes.careSession(T, SID)).toBe("/dashboard/nutriopus/atendimentos/session-abc"));
  it("builds agenda", () => expect(routes.agenda(T)).toBe("/dashboard/nutriopus/agenda"));
  it("builds ferramentas", () => expect(routes.ferramentas(T)).toBe("/dashboard/nutriopus/ferramentas"));
  it("builds taco", () => expect(routes.taco(T)).toBe("/dashboard/nutriopus/ferramentas/taco"));
  it("builds oficina", () => expect(routes.oficina(T)).toBe("/dashboard/nutriopus/ferramentas/oficina-planos"));
  it("builds oficina Studio detail", () =>
    expect(routes.oficinaStudio(T, "plan-abc")).toBe(
      "/dashboard/nutriopus/ferramentas/oficina-planos/plan-abc",
    ));
});

describe("routes — portal", () => {
  it("builds portalHome", () => expect(routes.portalHome(T)).toBe("/portal/nutriopus"));
  it("builds portalCardapio", () => expect(routes.portalCardapio(T)).toBe("/portal/nutriopus/cardapio"));
  it("builds portalEvolucao", () => expect(routes.portalEvolucao(T)).toBe("/portal/nutriopus/evolucao"));
});

describe("back routes", () => {
  it("patient detail back → patients list", () =>
    expect(back.toPatients(T)).toBe("/dashboard/nutriopus/pacientes"));
  it("relatorio back → patient", () =>
    expect(back.toPatient(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim"));
  it("medida detail back → medidas list", () =>
    expect(back.toPatientMedidas(T, PID)).toBe("/dashboard/nutriopus/pacientes/paulo-amorim/medidas"));
  it("care session detail back → care sessions", () =>
    expect(back.toCareSessions(T)).toBe("/dashboard/nutriopus/atendimentos"));
  it("tool back → ferramentas", () =>
    expect(back.toFerramentas(T)).toBe("/dashboard/nutriopus/ferramentas"));
  it("portal cardapio back → portal home", () =>
    expect(back.toPortalHome(T)).toBe("/portal/nutriopus"));
});
