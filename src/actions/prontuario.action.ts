"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";
import { headers } from "next/headers";
import {
  getPatientNotes, createPatientNote, updatePatientNote, deletePatientNote,
  getPatientTags, upsertPatientTag, deletePatientTag,
  getPatientTasks, createPatientTask, updatePatientTask, deletePatientTask,
  getPatientTimeline,
} from "@/services/prontuario.service";
import type { PatientTaskStatus, PatientTaskPriority } from "@prisma/client";
import { invalidatePatientDetail } from "@/lib/cache/invalidate-nutriopus-cache";

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getPatientNotesAction(tenantSlug: string, patientId: string) {
  let ctx;
  try {
    ctx = await requirePermission("medicalRecords", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { notes: [] };
  }
  const session = ctx.session;
  try {
    const notes = await getPatientNotes(session.nutritionistId, patientId);
    return { notes };
  } catch {
    return { notes: [] };
  }
}

export async function createPatientNoteAction(
  tenantSlug: string,
  patientId: string,
  data: { title?: string; body: string; tagIds?: string[] }
) {
  let ctx;
  try {
    ctx = await requirePermission("medicalRecords", "create", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    const note = await createPatientNote(session.nutritionistId, patientId, data);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "medicalRecord.note.create",
      resource: "medicalRecord",
      resourceId: note.id,
      patientId,
      result: "SUCCESS",
      changedFields: ["title", "body"],
      requestContext: { ip, userAgent },
    });

    return { note };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar nota." };
  }
}

export async function updatePatientNoteAction(
  tenantSlug: string,
  noteId: string,
  data: { title?: string; body?: string; isPinned?: boolean; tagIds?: string[] }
) {
  let ctx;
  try {
    ctx = await requirePermission("medicalRecords", "edit", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    const note = await updatePatientNote(session.nutritionistId, noteId, data);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId: note.patientId });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "medicalRecord.note.update",
      resource: "medicalRecord",
      resourceId: note.id,
      patientId: note.patientId,
      result: "SUCCESS",
      changedFields: Object.keys(data),
      requestContext: { ip, userAgent },
    });

    return { note };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar nota." };
  }
}

export async function deletePatientNoteAction(tenantSlug: string, noteId: string, patientId: string) {
  let ctx;
  try {
    ctx = await requirePermission("medicalRecords", "delete", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    await deletePatientNote(session.nutritionistId, noteId);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "medicalRecord.note.delete",
      resource: "medicalRecord",
      resourceId: noteId,
      patientId,
      result: "SUCCESS",
      requestContext: { ip, userAgent },
    });

    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao deletar nota." };
  }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getPatientTagsAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const tags = await getPatientTags(session.nutritionistId, patientId);
    return { tags };
  } catch {
    return { tags: [] };
  }
}

export async function upsertPatientTagAction(
  tenantSlug: string,
  patientId: string,
  label: string,
  color?: string
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const tag = await upsertPatientTag(session.nutritionistId, patientId, label, color);
    return { tag };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar tag." };
  }
}

export async function deletePatientTagAction(tenantSlug: string, tagId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await deletePatientTag(session.nutritionistId, tagId);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao deletar tag." };
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getPatientTasksAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const tasks = await getPatientTasks(session.nutritionistId, patientId);
    return { tasks };
  } catch {
    return { tasks: [] };
  }
}

export async function createPatientTaskAction(
  tenantSlug: string,
  patientId: string,
  data: { title: string; description?: string; priority?: PatientTaskPriority; dueDate?: Date }
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const task = await createPatientTask(session.nutritionistId, patientId, data);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { task };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar tarefa." };
  }
}

export async function updatePatientTaskAction(
  tenantSlug: string,
  taskId: string,
  data: { title?: string; description?: string; status?: PatientTaskStatus; priority?: PatientTaskPriority; dueDate?: Date | null }
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const task = await updatePatientTask(session.nutritionistId, taskId, data);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId: task.patientId });
    return { task };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar tarefa." };
  }
}

export async function deletePatientTaskAction(tenantSlug: string, taskId: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await deletePatientTask(session.nutritionistId, taskId);
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao deletar tarefa." };
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export async function getPatientTimelineAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const events = await getPatientTimeline(session.nutritionistId, patientId);
    return { events };
  } catch {
    return { events: [] };
  }
}
