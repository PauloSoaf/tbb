import { describe, expect, it } from "vitest";
import { getWelcomePatientTemplate } from "../WelcomePatientTemplate";
import { getAppointmentConfirmTemplate } from "../AppointmentConfirmTemplate";
import { getTeamInviteTemplate } from "../TeamInviteTemplate";
import { getNewAnamneseTemplate } from "../NewAnamneseTemplate";

describe("getWelcomePatientTemplate", () => {
  const base = {
    patientName: "Maria Silva",
    nutritionistName: "Dr. João",
    portalUrl: "https://app.example.com/portal",
  };

  it("includes patient name and nutritionist name", () => {
    const html = getWelcomePatientTemplate(base);
    expect(html).toContain("Maria Silva");
    expect(html).toContain("Dr. João");
  });

  it("without activationUrl shows 'Acessar meu portal' CTA", () => {
    const html = getWelcomePatientTemplate(base);
    expect(html).toContain("Acessar meu portal →");
    expect(html).not.toContain("Ativar minha conta →");
  });

  it("with activationUrl shows 'Ativar minha conta' CTA and 48h notice", () => {
    const html = getWelcomePatientTemplate({ ...base, activationUrl: "https://app.example.com/activate/token" });
    expect(html).toContain("Ativar minha conta →");
    expect(html).toContain("48 horas");
    expect(html).not.toContain("Acessar meu portal →");
  });

  it("includes the portal URL in the output", () => {
    const html = getWelcomePatientTemplate(base);
    expect(html).toContain("https://app.example.com/portal");
  });

  it("returns a string starting with an HTML doctype", () => {
    const html = getWelcomePatientTemplate(base);
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });
});

describe("getAppointmentConfirmTemplate", () => {
  const base = {
    patientName: "Ana Souza",
    nutritionistName: "Dra. Carla",
    date: "15/07/2026",
    mode: "ONLINE" as const,
    portalUrl: "https://app.example.com/portal",
  };

  it("includes patient and nutritionist names", () => {
    const html = getAppointmentConfirmTemplate(base);
    expect(html).toContain("Ana Souza");
    expect(html).toContain("Dra. Carla");
  });

  it("includes the date", () => {
    const html = getAppointmentConfirmTemplate(base);
    expect(html).toContain("15/07/2026");
  });

  it("renders ONLINE mode as 'Online (videochamada)'", () => {
    const html = getAppointmentConfirmTemplate(base);
    expect(html).toContain("Online (videochamada)");
  });

  it("renders PRESENTIAL mode correctly", () => {
    const html = getAppointmentConfirmTemplate({ ...base, mode: "PRESENTIAL" });
    expect(html).toContain("Presencial");
    expect(html).not.toContain("Online (videochamada)");
  });

  it("includes time when provided", () => {
    const html = getAppointmentConfirmTemplate({ ...base, time: "14:30" });
    expect(html).toContain("14:30");
  });

  it("omits time phrase when time is absent", () => {
    const html = getAppointmentConfirmTemplate(base);
    expect(html).not.toContain("às undefined");
  });
});

describe("getTeamInviteTemplate", () => {
  const params = {
    clinicName: "Clínica NutriVida",
    inviteUrl: "https://app.example.com/invite/abc123",
  };

  it("includes clinic name", () => {
    const html = getTeamInviteTemplate(params);
    expect(html).toContain("Clínica NutriVida");
  });

  it("includes the invite URL twice (button + fallback link)", () => {
    const html = getTeamInviteTemplate(params);
    const count = (html.match(/https:\/\/app\.example\.com\/invite\/abc123/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("includes 'Aceitar Convite' CTA text", () => {
    const html = getTeamInviteTemplate(params);
    expect(html).toContain("Aceitar Convite");
  });
});

describe("getNewAnamneseTemplate", () => {
  const params = {
    nutritionistName: "Dra. Paula",
    patientName: "Carlos Lima",
    patientPhone: "(11) 98765-4321",
    dashboardUrl: "https://app.example.com/dashboard/clinica/anamneses",
  };

  it("includes nutritionist and patient names", () => {
    const html = getNewAnamneseTemplate(params);
    expect(html).toContain("Dra. Paula");
    expect(html).toContain("Carlos Lima");
  });

  it("includes patient phone", () => {
    const html = getNewAnamneseTemplate(params);
    expect(html).toContain("(11) 98765-4321");
  });

  it("includes the dashboard URL", () => {
    const html = getNewAnamneseTemplate(params);
    expect(html).toContain("https://app.example.com/dashboard/clinica/anamneses");
  });

  it("mentions reviewing in the dashboard CTA", () => {
    const html = getNewAnamneseTemplate(params);
    expect(html).toContain("Ver anamnese no dashboard");
  });
});
