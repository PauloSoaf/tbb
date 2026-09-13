import { revalidatePath } from "next/cache";

// Granular revalidation helpers.
// revalidatePath clears both the Next.js page cache and the Router Cache
// for the specific URL. Use after mutations to ensure fresh data on next visit.
//
// Note: revalidateTag (for the new "use cache" directive) has a different API
// in Next.js 16 — these helpers use revalidatePath which works with both
// unstable_cache (via TTL expiry) and standard page caching.

export function revalidateDashboard(tenant: string) {
  revalidatePath(`/dashboard/${tenant}`, "page");
}

export function revalidatePatientList(tenant: string) {
  revalidatePath(`/dashboard/${tenant}/pacientes`, "page");
}

export function revalidatePatientRecord(tenant: string, patientId: string) {
  revalidatePath(`/dashboard/${tenant}/pacientes/${patientId}`, "page");
}

export function revalidatePortalHome(tenant: string) {
  revalidatePath(`/portal/${tenant}`, "page");
}

export function revalidatePortalMealPlan(tenant: string) {
  revalidatePath(`/portal/${tenant}/cardapio`, "page");
}

export function revalidateAgenda(tenant: string) {
  revalidatePath(`/dashboard/${tenant}/agenda`, "page");
}

export function revalidateCareSessions(tenant: string) {
  revalidatePath(`/dashboard/${tenant}/atendimentos`, "page");
}
