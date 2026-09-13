"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import {
  createSkinfoldAssessment,
  getSkinfoldAssessments,
  getSkinfoldAssessment,
  deleteSkinfoldAssessment,
} from "@/services/skinfold.service";
import type { Protocol } from "@/lib/skinfold/protocols";
import { invalidatePatientDetail } from "@/lib/cache/invalidate-nutriopus-cache";

export async function createSkinfoldAssessmentAction(
  tenantSlug: string,
  patientId: string,
  data: {
    protocol: Protocol;
    age: number;
    sex: "M" | "F";
    weight?: number;
    chest?: number;
    axillary?: number;
    triceps?: number;
    subscapular?: number;
    abdominal?: number;
    suprailiac?: number;
    thigh?: number;
    medialCalf?: number;
    notes?: string;
    assessedAt?: Date;
  }
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const assessment = await createSkinfoldAssessment(session.nutritionistId, patientId, data);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { assessment };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar avaliação." };
  }
}

export async function getSkinfoldAssessmentsAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const assessments = await getSkinfoldAssessments(session.nutritionistId, patientId);
    return { assessments };
  } catch {
    return { assessments: [] };
  }
}

export async function getSkinfoldAssessmentAction(tenantSlug: string, id: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const assessment = await getSkinfoldAssessment(session.nutritionistId, id);
    return { assessment };
  } catch {
    return { assessment: null };
  }
}

export async function deleteSkinfoldAssessmentAction(
  tenantSlug: string,
  id: string,
  patientId: string
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await deleteSkinfoldAssessment(session.nutritionistId, id);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao excluir avaliação." };
  }
}
