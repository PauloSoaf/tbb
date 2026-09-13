"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { dayKey } from "@/lib/dates";
import { entrySchema, habitSchema } from "./schemas";
import { habitPeriod, isHabitDay } from "./logic";

function refresh(id?: string) {
  for (const path of ["/habits", "/today", "/calendar", "/insights", ...(id ? [`/habits/${id}`] : [])]) revalidatePath(path);
}

export async function saveHabit(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = habitSchema.safeParse({ ...Object.fromEntries(formData), days: formData.getAll("days") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = String(formData.get("id") || "");
  const { days, time, monthlyDay, ...input } = parsed.data;
  const data = { ...input, endDate: input.endDate || null, description: input.description || null, target: input.type === "BOOLEAN" ? 1 : input.target, unit: input.type === "BOOLEAN" ? "vez" : input.unit };
  try {
    const habit = await prisma.$transaction(async (tx) => {
      if (id && !await tx.habit.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } })) throw new Error("Hábito não encontrado.");
      const record = id
        ? await tx.habit.update({ where: { id, workspaceId: context.workspaceId }, data })
        : await tx.habit.create({ data: { ...data, workspaceId: context.workspaceId } });
      await tx.habitSchedule.upsert({ where: { habitId: record.id }, create: { habitId: record.id, workspaceId: context.workspaceId, days: [...new Set(days)], time: time || null, monthlyDay: monthlyDay || null }, update: { days: [...new Set(days)], time: time || null, monthlyDay: monthlyDay || null } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: id ? "HabitUpdated" : "HabitCreated", entityType: "Habit", entityId: record.id, metadata: { name: record.name } } });
      return record;
    });
    refresh(habit.id);
    return { success: id ? "Hábito atualizado." : "Hábito criado." };
  } catch (error) {
    return { error: error instanceof Error && error.message === "Hábito não encontrado." ? error.message : "Não foi possível salvar o hábito. Tente novamente." };
  }
}

export async function archiveHabit(formData: FormData) {
  const context = await requirePermission("WRITE");
  const id = String(formData.get("id") || "");
  try {
    await prisma.$transaction(async (tx) => {
      const habit = await tx.habit.findFirst({ where: { id, workspaceId: context.workspaceId } });
      if (!habit) throw new Error("Hábito não encontrado.");
      await tx.habit.update({ where: { id, workspaceId: context.workspaceId }, data: { isArchived: !habit.isArchived } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "HabitUpdated", entityType: "Habit", entityId: id, metadata: { archived: !habit.isArchived } } });
    });
    refresh(id);
    return { success: "Hábito atualizado." };
  } catch { return { error: "Não foi possível atualizar este hábito." }; }
}

export async function recordHabitEntry(formData: FormData) {
  const context = await requirePermission("WRITE");
  const parsed = entrySchema.safeParse({ ...Object.fromEntries(formData), note: formData.has("note") ? String(formData.get("note")) : undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;
  if (input.date > dayKey(new Date(), context.workspace.timezone)) return { error: "Você pode registrar somente hoje ou dias anteriores." };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const habit = await tx.habit.findFirst({ where: { id: input.habitId, workspaceId: context.workspaceId }, include: { schedule: true } });
        if (!habit || habit.isArchived) throw new Error("Hábito indisponível.");
        if (!isHabitDay(habit, input.date)) throw new Error("Este dia está fora da programação do hábito.");
        const previous = await tx.habitEntry.findUnique({ where: { habitId_date: { habitId: habit.id, date: input.date } } });
        const period = habitPeriod(habit, input.date);
        const otherEntries = await tx.habitEntry.findMany({ where: { habitId: habit.id, workspaceId: context.workspaceId, date: { gte: period.start, lte: period.end, not: input.date } } });
        const otherValue = otherEntries.filter((entry) => isHabitDay(habit, entry.date)).reduce((sum, entry) => sum + entry.value, 0);
        let value = input.value;
        if (input.operation === "increment") value = (previous?.value ?? 0) + (input.value || 1);
        if (input.operation === "decrement") value = Math.max(0, (previous?.value ?? 0) - (input.value || 1));
        if (input.operation === "complete") value = Math.max(previous?.value ?? 0, habit.target - otherValue);
        if (input.operation === "undo") value = 0;
        if (habit.type === "BOOLEAN") value = value > 0 ? 1 : 0;
        value = Math.round(value * 1_000_000) / 1_000_000;
        if (!Number.isFinite(value) || value > 1_000_000_000) throw new Error("Valor acima do limite permitido.");
        const completed = otherValue + value >= habit.target;
        await tx.habitEntry.upsert({ where: { habitId_date: { habitId: habit.id, date: input.date } }, create: { habitId: habit.id, workspaceId: context.workspaceId, date: input.date, value, completed, note: input.note || null }, update: { value, completed, ...(input.note !== undefined ? { note: input.note || null } : {}) } });
        // Keep period completion metadata consistent when a weekly/monthly entry is changed.
        await tx.habitEntry.updateMany({ where: { habitId: habit.id, workspaceId: context.workspaceId, date: { gte: period.start, lte: period.end } }, data: { completed } });
        await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: completed ? "HabitCompleted" : "HabitEntryUpdated", entityType: "Habit", entityId: habit.id, metadata: { name: habit.name, date: input.date, value, completed, previousValue: previous?.value ?? 0 } } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      refresh(input.habitId);
      return { success: input.operation === "undo" ? "Registro desfeito." : "Progresso salvo." };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      const allowed = ["Hábito indisponível.", "Este dia está fora da programação do hábito.", "Valor acima do limite permitido."];
      return { error: error instanceof Error && allowed.includes(error.message) ? error.message : "Não foi possível salvar o progresso. Tente novamente." };
    }
  }
  return { error: "Outro registro está sendo salvo. Tente novamente." };
}
