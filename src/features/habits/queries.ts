import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { dayKey, startOfWeek, startOfMonth } from "@/lib/dates";
import { habitProgress, isHabitDay } from "./logic";

export async function getHabitsData() {
  const context = await getWorkspaceContext();
  const today = dayKey(new Date(), context.workspace.timezone);
  const habits = await prisma.habit.findMany({ where: { workspaceId: context.workspaceId }, include: { schedule: true, entries: { orderBy: { date: "asc" } } }, orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }] });
  return { context, today, habits };
}

export async function getHabitData(id: string) {
  const context = await getWorkspaceContext();
  const habit = await prisma.habit.findFirst({ where: { id, workspaceId: context.workspaceId }, include: { schedule: true, entries: { orderBy: { date: "asc" } } } });
  return { context, habit, today: dayKey(new Date(), context.workspace.timezone) };
}

export async function getTodayHabits(workspaceId: string, today: string) {
  const rangeStart = [startOfWeek(today), startOfMonth(today)].sort()[0];
  const habits = await prisma.habit.findMany({ where: { workspaceId, isArchived: false, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, include: { schedule: true, entries: { where: { date: { gte: rangeStart, lte: today } } } }, orderBy: { createdAt: "asc" } });
  return habits.filter((habit) => isHabitDay(habit, today)).map((habit) => ({ ...habit, progress: habitProgress(habit, habit.entries, today) }));
}
