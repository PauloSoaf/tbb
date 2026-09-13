"use server";

import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import {
  getFoodDiaryEntries, createFoodDiaryEntry, deleteFoodDiaryEntry, getDiaryStats,
  type DiaryEntryInput,
} from "@/services/food-diary.service";
import { invalidatePortalDiary } from "@/lib/cache/invalidate-nutriopus-cache";

async function getPortalIds(tenant: string) {
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) throw new Error("Não autorizado.");
  return { patientId: session.patientId, nutritionistId: session.nutritionistId };
}

// ─── Patient (portal) ────────────────────────────────────────────────────────

export async function getPortalDiaryAction(tenant: string, from?: Date, to?: Date) {
  try {
    const { patientId, nutritionistId } = await getPortalIds(tenant);
    const entries = await getFoodDiaryEntries(patientId, nutritionistId, from, to);
    return { entries };
  } catch (e) { return { entries: [], error: e instanceof Error ? e.message : "Erro" }; }
}

export async function addPortalDiaryEntryAction(tenant: string, data: DiaryEntryInput) {
  try {
    const { patientId, nutritionistId } = await getPortalIds(tenant);
    const entry = await createFoodDiaryEntry(patientId, nutritionistId, data);
    invalidatePortalDiary({ patientId, tenant });
    return { entry };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao registrar." }; }
}

export async function deletePortalDiaryEntryAction(tenant: string, entryId: string) {
  try {
    const { patientId, nutritionistId } = await getPortalIds(tenant);
    await deleteFoodDiaryEntry(patientId, nutritionistId, entryId);
    invalidatePortalDiary({ patientId, tenant });
    return { success: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao remover." }; }
}

// ─── Dashboard (nutritionist) ────────────────────────────────────────────────

export async function getPatientDiaryAction(tenantSlug: string, patientId: string, from?: Date, to?: Date) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const entries = await getFoodDiaryEntries(patientId, session.nutritionistId, from, to);
    return { entries };
  } catch (e) { return { entries: [], error: e instanceof Error ? e.message : "Erro" }; }
}

export async function getPatientDiaryStatsAction(tenantSlug: string, patientId: string, from: Date, to: Date) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const stats = await getDiaryStats(patientId, session.nutritionistId, from, to);
    return { stats };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro" }; }
}
