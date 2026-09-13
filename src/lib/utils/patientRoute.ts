import { buildPatientSlug } from "@/lib/utils/patientSlug";

type PatientParam = { id: string; name?: string };

export function getPatientHref(options: { tenant: string; patient: PatientParam; suffix?: string; hash?: string }): string {
  const { tenant, patient, suffix = "", hash = "" } = options;
  const identifier = patient.name ? buildPatientSlug(patient as { id: string; name: string }) : patient.id;
  const suffixPart = suffix ? `/${suffix}` : "";
  const hashPart = hash ? `#${hash}` : "";
  return `/dashboard/${tenant}/pacientes/${identifier}${suffixPart}${hashPart}`;
}

export function getPatientEditHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "editar" });
}

export function getPatientMeasurementsHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "avaliacoes" });
}

export function getPatientEvaluationsHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "avaliacoes" });
}

export function getPatientMealPlansHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "planos" });
}

export function getPatientAppointmentsHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "consultas" });
}

export function getPatientFilesHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "arquivos" });
}

export function getPatientAnamnesisHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "anamnese" });
}

export function getPatientChatHref(tenant: string, patient: PatientParam) {
  return getPatientHref({ tenant, patient, suffix: "chat" });
}
