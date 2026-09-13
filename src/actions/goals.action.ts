"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import {
  getPatientGoals, createPatientGoal, updatePatientGoalStatus, addGoalCheckIn, deletePatientGoal,
  getPatientReminders, createPatientReminder, togglePatientReminder, deletePatientReminder, nextSendAtFromFrequency,
} from "@/services/goals.service";
import type { GoalType, GoalStatus, ReminderFrequency } from "@prisma/client";
import { invalidatePatientGoals } from "@/lib/cache/invalidate-nutriopus-cache";

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getPatientGoalsAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try { return { goals: await getPatientGoals(session.nutritionistId, patientId) }; }
  catch { return { goals: [] }; }
}

export async function createPatientGoalAction(
  tenantSlug: string,
  patientId: string,
  data: { type?: GoalType; title: string; description?: string; targetValue?: number; targetUnit?: string; initialValue?: number; targetDate?: Date }
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const goal = await createPatientGoal(session.nutritionistId, patientId, data);
    invalidatePatientGoals({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { goal };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao criar meta." }; }
}

export async function updateGoalStatusAction(tenantSlug: string, goalId: string, status: GoalStatus, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const goal = await updatePatientGoalStatus(session.nutritionistId, goalId, status);
    invalidatePatientGoals({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { goal };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao atualizar meta." }; }
}

export async function addGoalCheckInAction(tenantSlug: string, goalId: string, value: number, note?: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const checkIn = await addGoalCheckIn(session.nutritionistId, goalId, value, note);
    return { checkIn };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao registrar check-in." }; }
}

export async function deletePatientGoalAction(tenantSlug: string, goalId: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await deletePatientGoal(session.nutritionistId, goalId);
    invalidatePatientGoals({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao remover meta." }; }
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function getPatientRemindersAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try { return { reminders: await getPatientReminders(session.nutritionistId, patientId) }; }
  catch { return { reminders: [] }; }
}

export async function createPatientReminderAction(
  tenantSlug: string,
  patientId: string,
  data: { title: string; body?: string; frequency: ReminderFrequency }
) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const reminder = await createPatientReminder(session.nutritionistId, patientId, {
      ...data,
      nextSendAt: nextSendAtFromFrequency(data.frequency),
    });
    return { reminder };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao criar lembrete." }; }
}

export async function toggleReminderAction(tenantSlug: string, reminderId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    const reminder = await togglePatientReminder(session.nutritionistId, reminderId);
    return { reminder };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao alterar lembrete." }; }
}

export async function deletePatientReminderAction(tenantSlug: string, reminderId: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await deletePatientReminder(session.nutritionistId, reminderId);
    invalidatePatientGoals({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao remover lembrete." }; }
}
