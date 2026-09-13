"use server";

import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getPatientTimeline, addPatientNote } from "@/services/patient-timeline.service";
import { invalidatePatientDetail } from "@/lib/cache/invalidate-nutriopus-cache";

export async function getPatientTimelineAction(patientId: string) {
  try {
    const ctx = await requirePermission("medicalRecords", "view", undefined, { throwOnFailure: true });
    const events = await getPatientTimeline(ctx.nutritionistId, patientId);
    return { success: true, events };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao carregar linha do tempo." };
  }
}

export async function addPatientNoteAction(patientId: string, body: string, title?: string) {
  try {
    if (!body?.trim()) return { success: false, error: "A nota não pode estar vazia." };
    const ctx = await requirePermission("medicalRecords", "create", undefined, { throwOnFailure: true });
    const note = await addPatientNote(ctx.nutritionistId, patientId, body, title);
    invalidatePatientDetail({ nutritionistId: ctx.nutritionistId, tenant: ctx.slug, patientId });
    return { success: true, note };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao adicionar nota." };
  }
}
