// Resolves the [patientId] route param in demo patient pages. Real components
// (PatientTable, sticky header, action sidebar…) build links with
// buildPatientSlug(name, id) — e.g. "debora-almeida--deborah" — while demo
// data is keyed by raw ids ("demo-patient-deborah"). Accept both.
import { buildPatientSlug } from "@/lib/utils/patientSlug";
import type { DemoPatient } from "./demo-data";

export function resolveDemoPatient(patients: DemoPatient[], param: string): DemoPatient | undefined {
  const decoded = decodeURIComponent(param);
  return (
    patients.find((p) => p.id === decoded) ??
    patients.find((p) => buildPatientSlug({ id: p.id, name: p.name }) === decoded)
  );
}
