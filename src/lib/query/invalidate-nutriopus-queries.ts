import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

// Client-side query invalidation (TanStack Query).
// Call these inside client components after Server Actions complete.
// Use alongside server-side invalidation (invalidate-nutriopus-cache.ts)
// so both the RSC payload and the TanStack cache reflect the mutation.

export function invalidateAppointmentQueries(qc: QueryClient, tenant: string, patientId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.agenda(tenant) });
  qc.invalidateQueries({ queryKey: queryKeys.appointments(tenant) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardAppointments(tenant) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardStats(tenant) });
  if (patientId) {
    qc.invalidateQueries({ queryKey: queryKeys.patient(tenant, patientId) });
    qc.invalidateQueries({ queryKey: queryKeys.patientTimeline(tenant, patientId) });
  }
}

export function invalidatePatientQueries(qc: QueryClient, tenant: string, patientId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.patients(tenant) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardStats(tenant) });
  if (patientId) {
    qc.invalidateQueries({ queryKey: queryKeys.patient(tenant, patientId) });
  }
}

export function invalidateMealPlanQueries(qc: QueryClient, tenant: string, patientId?: string) {
  if (patientId) {
    qc.invalidateQueries({ queryKey: queryKeys.patientMealPlans(tenant, patientId) });
    qc.invalidateQueries({ queryKey: queryKeys.patient(tenant, patientId) });
  }
  qc.invalidateQueries({ queryKey: queryKeys.portalMealPlan(tenant) });
}

export function invalidateGoalQueries(qc: QueryClient, tenant: string, patientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.patientGoals(tenant, patientId) });
  qc.invalidateQueries({ queryKey: queryKeys.portalGoals(tenant) });
}

export function invalidateChatQueries(qc: QueryClient, tenant: string, patientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.patientChat(tenant, patientId) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardMessages(tenant) });
  qc.invalidateQueries({ queryKey: queryKeys.portalChat(tenant) });
}

export function invalidateDashboardQueries(qc: QueryClient, tenant: string) {
  qc.invalidateQueries({ queryKey: queryKeys.dashboard(tenant) });
}

export function invalidateCareSessionQueries(qc: QueryClient, tenant: string, patientId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.careSessions(tenant) });
  if (patientId) {
    qc.invalidateQueries({ queryKey: queryKeys.patientTimeline(tenant, patientId) });
  }
}
