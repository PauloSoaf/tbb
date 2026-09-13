"use server";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { lgpdService } from "@/services/lgpd.service";
import { revalidatePath } from "next/cache";

export async function getLgpdDataAction(tenantSlug: string, patientId?: string) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a visualizar central de privacidade." };
  }

  try {
    const [consents, requests] = await Promise.all([
      lgpdService.listConsentRecords(ctx.session.nutritionistId, patientId),
      lgpdService.listDataSubjectRequests(ctx.session.nutritionistId),
    ]);
    return { consents, requests };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao carregar dados LGPD." };
  }
}

export async function recordConsentAction(
  tenantSlug: string,
  patientId: string,
  consentType: string,
  textSnapshot: string,
  source = "MANUAL"
) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "manageConsent", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a registrar consentimento." };
  }

  try {
    const record = await lgpdService.recordConsent(
      ctx.session.nutritionistId,
      patientId,
      consentType,
      textSnapshot,
      source,
      {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      }
    );
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/privacidade`);
    return { success: true, record };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao registrar consentimento." };
  }
}

export async function revokeConsentAction(tenantSlug: string, consentId: string) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "manageConsent", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a revogar consentimento." };
  }

  try {
    await lgpdService.revokeConsent(ctx.session.nutritionistId, consentId, {
      userId: ctx.userId,
      teamMemberId: ctx.teamMemberId,
      name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
      role: ctx.role,
    });
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/privacidade`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao revogar consentimento." };
  }
}

export async function createDataSubjectRequestAction(
  tenantSlug: string,
  patientId: string,
  type: "ACCESS" | "EXPORT" | "DELETION",
  notes?: string
) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a abrir solicitação." };
  }

  try {
    const req = await lgpdService.createDataSubjectRequest(
      ctx.session.nutritionistId,
      patientId,
      type,
      notes,
      {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      }
    );
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/privacidade`);
    return { success: true, request: req };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar solicitação." };
  }
}

export async function exportPatientDataAction(tenantSlug: string, patientId: string) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "exportData", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a exportar dados de portabilidade." };
  }

  try {
    const bundle = await lgpdService.exportPatientData(ctx.session.nutritionistId, patientId, {
      userId: ctx.userId,
      teamMemberId: ctx.teamMemberId,
      name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
      role: ctx.role,
    });
    return { success: true, bundle };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao exportar dados." };
  }
}

export async function pseudonymizePatientAction(tenantSlug: string, patientId: string) {
  let ctx;
  try {
    ctx = await requirePermission("lgpd", "deleteDataRequest", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado a excluir/pseudonimizar paciente (Direito ao Esquecimento)." };
  }

  try {
    const updated = await lgpdService.pseudonymizePatient(ctx.session.nutritionistId, patientId, {
      userId: ctx.userId,
      teamMemberId: ctx.teamMemberId,
      name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
      role: ctx.role,
    });
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/privacidade`);
    revalidatePath(`/dashboard/${tenantSlug}/pacientes`);
    return { success: true, patient: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao excluir/pseudonimizar paciente." };
  }
}
