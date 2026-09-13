"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { zonedDateTimeToUtc } from "@/lib/dates";
import { goalSchema, projectSchema, taskSchema } from "./schemas";

class LifeInputError extends Error {}
function refresh() { for (const path of ["/today", "/tasks", "/projects", "/goals", "/calendar", "/insights"]) revalidatePath(path); }
function failure(error: unknown) { return { error: error instanceof LifeInputError ? error.message : "Não foi possível salvar. Tente novamente." }; }
async function event(tx: Prisma.TransactionClient, workspaceId: string, actorUserId: string, type: string, entityType: string, entityId: string, metadata: Prisma.InputJsonObject) {
  await tx.activityEvent.create({ data: { workspaceId, actorUserId, type, entityType, entityId, metadata } });
}

export async function saveTask(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = String(formData.get("id") || "");
  const input = parsed.data;
  let scheduledAt: Date | null = null;
  try { scheduledAt = input.scheduledAt ? zonedDateTimeToUtc(input.scheduledAt, context.workspace.timezone) : null; }
  catch (error) { return { error: error instanceof Error ? error.message : "Horário inválido." }; }
  try {
    await prisma.$transaction(async (tx) => {
      const existing = id ? await tx.task.findFirst({ where: { id, workspaceId: context.workspaceId } }) : null;
      if (id && !existing) throw new LifeInputError("Tarefa não encontrada.");
      if (input.projectId && !await tx.project.findFirst({ where: { id: input.projectId, workspaceId: context.workspaceId }, select: { id: true } })) throw new LifeInputError("Projeto não encontrado neste workspace.");
      const data = { title: input.title, description: input.description || null, projectId: input.projectId || null, priority: input.priority, status: input.status, dueDate: input.dueDate || null, scheduledAt, estimatedDuration: input.estimatedDuration || null, tags: [...new Set(input.tags.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20), completedAt: input.status === "DONE" ? existing?.completedAt ?? new Date() : null };
      const task = id ? await tx.task.update({ where: { id, workspaceId: context.workspaceId }, data }) : await tx.task.create({ data: { ...data, workspaceId: context.workspaceId } });
      await event(tx, context.workspaceId, context.userId, task.status === "DONE" && existing?.status !== "DONE" ? "TaskCompleted" : id ? "TaskUpdated" : "TaskCreated", "Task", task.id, { title: task.title, status: task.status });
    });
    refresh();
    return { success: id ? "Tarefa atualizada." : "Tarefa criada." };
  } catch (error) { return failure(error); }
}

export async function changeTaskStatus(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = z.object({ id: z.string().min(1), status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escolha um status válido." };
  try {
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({ where: { id: parsed.data.id, workspaceId: context.workspaceId } });
      if (!task) throw new LifeInputError("Tarefa não encontrada.");
      await tx.task.update({ where: { id: task.id, workspaceId: context.workspaceId }, data: { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? task.completedAt ?? new Date() : null } });
      await event(tx, context.workspaceId, context.userId, parsed.data.status === "DONE" ? "TaskCompleted" : "TaskUpdated", "Task", task.id, { title: task.title, status: parsed.data.status });
    });
    refresh();
    return { success: parsed.data.status === "DONE" ? "Tarefa concluída." : "Status atualizado." };
  } catch (error) { return failure(error); }
}

export async function saveProject(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = String(formData.get("id") || "");
  const input = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      if (id && !await tx.project.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } })) throw new LifeInputError("Projeto não encontrado.");
      const data = { ...input, description: input.description || null, startDate: input.startDate || null, targetDate: input.targetDate || null };
      const project = id ? await tx.project.update({ where: { id, workspaceId: context.workspaceId }, data }) : await tx.project.create({ data: { ...data, workspaceId: context.workspaceId } });
      await event(tx, context.workspaceId, context.userId, id ? "ProjectUpdated" : "ProjectCreated", "Project", project.id, { name: project.name, status: project.status });
    });
    refresh();
    return { success: id ? "Projeto atualizado." : "Projeto criado." };
  } catch (error) { return failure(error); }
}

export async function saveGoal(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = String(formData.get("id") || "");
  const input = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      if (id && !await tx.goal.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } })) throw new LifeInputError("Meta não encontrada.");
      if (input.linkedEntityId) {
        const where = { id: input.linkedEntityId, workspaceId: context.workspaceId };
        const linked = input.linkedModule === "HABITS" ? await tx.habit.findFirst({ where, select: { id: true } })
          : input.linkedModule === "TASKS" ? await tx.task.findFirst({ where, select: { id: true } })
          : input.linkedModule === "CAREER" ? await tx.application.findFirst({ where, select: { id: true } })
          : await tx.savingsGoal.findFirst({ where, select: { id: true } });
        if (!linked) throw new LifeInputError("Registro vinculado não encontrado neste workspace.");
      }
      const target = input.type === "BOOLEAN" ? 1 : input.type === "MONEY" ? Math.round(input.target * 100) : input.target;
      const current = input.type === "BOOLEAN" ? Math.min(1, input.current) : input.type === "MONEY" ? Math.round(input.current * 100) : input.current;
      if (!Number.isSafeInteger(target) && input.type === "MONEY") throw new LifeInputError("Valor monetário acima do limite.");
      if (input.status === "ACHIEVED" && current < target) throw new LifeInputError("Registre o progresso total antes de marcar a meta como alcançada.");
      const data = { ...input, target, current, description: input.description || null, targetDate: input.targetDate || null, linkedModule: input.linkedModule || null, linkedEntityId: input.linkedEntityId || null, status: current >= target && input.status === "ACTIVE" ? "ACHIEVED" as const : input.status };
      const goal = id ? await tx.goal.update({ where: { id, workspaceId: context.workspaceId }, data }) : await tx.goal.create({ data: { ...data, workspaceId: context.workspaceId } });
      await event(tx, context.workspaceId, context.userId, "GoalProgressUpdated", "Goal", goal.id, { name: goal.name, current: goal.current, target: goal.target });
    });
    refresh();
    return { success: id ? "Meta atualizada." : "Meta criada." };
  } catch (error) { return failure(error); }
}
