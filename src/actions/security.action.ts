"use server";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogQueryService, type AuditLogFilters } from "@/services/audit-log.query.service";
import { sessionService } from "@/services/session.service";
import { securityEventService, type SecurityEventFilters } from "@/services/security-event.service";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "crypto";

export async function getAuditLogsAction(tenantSlug: string, filters: Partial<AuditLogFilters>) {
  let ctx;
  try {
    ctx = await requirePermission("auditLogs", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { data: null, error: "Não autorizado a visualizar logs de auditoria." };
  }

  try {
    const result = await auditLogQueryService.queryLogs({
      ...filters,
      tenantId: ctx.session.nutritionistId,
    });
    return { data: result };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao carregar auditoria." };
  }
}

export async function getSessionsAction(tenantSlug: string) {
  let ctx;
  try {
    ctx = await requirePermission("sessions", "viewOwn", tenantSlug, { throwOnFailure: true });
  } catch {
    return { data: null, error: "Não autorizado a visualizar sessões." };
  }

  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get("nutriopus-session")?.value;
    const currentHash = rawToken ? createHash("sha256").update(rawToken).digest("hex") : undefined;

    const canViewTeam = ctx.isOwner || ctx.isGlobalAdmin || ctx.permissions.has("sessions.viewTeam");
    const sessions = canViewTeam
      ? await sessionService.listTenantSessions(ctx.session.nutritionistId, currentHash)
      : await sessionService.listUserSessions(ctx.userId, currentHash);

    return { data: sessions, canViewTeam, canRevokeTeam: ctx.isOwner || ctx.isGlobalAdmin || ctx.permissions.has("sessions.revokeTeam") };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao listar sessões." };
  }
}

export async function revokeSessionAction(tenantSlug: string, targetSessionId: string) {
  let ctx;
  try {
    ctx = await requirePermission("sessions", "revokeOwn", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }

  try {
    const canRevokeTeam = ctx.isOwner || ctx.isGlobalAdmin || ctx.permissions.has("sessions.revokeTeam");
    const updated = await sessionService.revokeSession(
      ctx.session.nutritionistId,
      {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      targetSessionId,
      canRevokeTeam
    );

    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/seguranca`);
    return { success: true, session: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao revogar sessão." };
  }
}

export async function getSecurityEventsAction(tenantSlug: string, filters?: Partial<SecurityEventFilters>) {
  let ctx;
  try {
    ctx = await requirePermission("securityEvents", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { data: null, error: "Não autorizado a visualizar alertas de segurança." };
  }

  try {
    const events = await securityEventService.listEvents({
      tenantId: ctx.session.nutritionistId,
      severity: filters?.severity,
      status: filters?.status,
    });
    return { data: events };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao carregar alertas." };
  }
}

export async function acknowledgeSecurityEventAction(tenantSlug: string, eventId: string) {
  let ctx;
  try {
    ctx = await requirePermission("securityEvents", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado." };
  }

  try {
    await securityEventService.acknowledgeEvent(ctx.session.nutritionistId, eventId);
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/seguranca`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar alerta." };
  }
}

export async function resolveSecurityEventAction(tenantSlug: string, eventId: string) {
  let ctx;
  try {
    ctx = await requirePermission("securityEvents", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado." };
  }

  try {
    await securityEventService.resolveEvent(ctx.session.nutritionistId, eventId);
    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/seguranca`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao resolver alerta." };
  }
}
