import { routes } from "./routes";

/** Deterministic back-route helpers — never depend on browser history */

export const back = {
  // Patient hierarchy
  toPatients:       (tenant: string) => routes.patients(tenant),
  toPatient:        (tenant: string, patientId: string) => routes.patient(tenant, patientId),
  toPatientMedidas: (tenant: string, patientId: string) => routes.patientMedidas(tenant, patientId),
  toPatientPlanos:  (tenant: string, patientId: string) => routes.patientPlanos(tenant, patientId),

  // Care sessions
  toCareSessions:   (tenant: string) => routes.careSessions(tenant),

  // Agenda
  toAgenda:         (tenant: string) => routes.agenda(tenant),

  // Tools
  toFerramentas:    (tenant: string) => routes.ferramentas(tenant),
  toOficina:        (tenant: string) => routes.oficina(tenant),

  // Dashboard
  toDashboard:      (tenant: string) => routes.dashboard(tenant),

  // Portal
  toPortalHome:     (tenant: string) => routes.portalHome(tenant),
  toPortalCardapio: (tenant: string) => routes.portalCardapio(tenant),
} as const;
