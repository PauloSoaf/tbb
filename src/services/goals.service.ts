import { prisma } from "@/lib/prisma";
import type { GoalType, GoalStatus, ReminderFrequency } from "@prisma/client";

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getPatientGoals(nutritionistId: string, patientId: string) {
  return prisma.patientGoal.findMany({
    where: { nutritionistId, patientId },
    include: { checkIns: { orderBy: { checkedAt: "desc" }, take: 10 } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createPatientGoal(
  nutritionistId: string,
  patientId: string,
  data: {
    type?: GoalType;
    title: string;
    description?: string;
    targetValue?: number;
    targetUnit?: string;
    initialValue?: number;
    targetDate?: Date;
  }
) {
  return prisma.patientGoal.create({
    data: {
      nutritionistId,
      patientId,
      type: data.type ?? "CUSTOM",
      title: data.title,
      description: data.description,
      targetValue: data.targetValue,
      targetUnit: data.targetUnit,
      initialValue: data.initialValue,
      currentValue: data.initialValue,
      targetDate: data.targetDate,
    },
    include: { checkIns: true },
  });
}

export async function updatePatientGoalStatus(
  nutritionistId: string,
  goalId: string,
  status: GoalStatus
) {
  const goal = await prisma.patientGoal.findFirst({ where: { id: goalId, nutritionistId } });
  if (!goal) throw new Error("Goal not found");
  return prisma.patientGoal.update({
    where: { id: goalId },
    data: { status, achievedAt: status === "ACHIEVED" ? new Date() : null },
  });
}

export async function addGoalCheckIn(
  nutritionistId: string,
  goalId: string,
  value: number,
  note?: string
) {
  const goal = await prisma.patientGoal.findFirst({ where: { id: goalId, nutritionistId } });
  if (!goal) throw new Error("Goal not found");
  const [checkIn] = await prisma.$transaction([
    prisma.goalCheckIn.create({ data: { goalId, value, note } }),
    prisma.patientGoal.update({ where: { id: goalId }, data: { currentValue: value } }),
  ]);
  return checkIn;
}

export async function deletePatientGoal(nutritionistId: string, goalId: string) {
  const goal = await prisma.patientGoal.findFirst({ where: { id: goalId, nutritionistId } });
  if (!goal) throw new Error("Goal not found");
  return prisma.patientGoal.delete({ where: { id: goalId } });
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export async function getPatientReminders(nutritionistId: string, patientId: string) {
  return prisma.patientReminder.findMany({
    where: { nutritionistId, patientId },
    orderBy: { nextSendAt: "asc" },
  });
}

export async function createPatientReminder(
  nutritionistId: string,
  patientId: string,
  data: {
    title: string;
    body?: string;
    frequency: ReminderFrequency;
    nextSendAt: Date;
  }
) {
  return prisma.patientReminder.create({
    data: { nutritionistId, patientId, ...data },
  });
}

export async function togglePatientReminder(nutritionistId: string, reminderId: string) {
  const rem = await prisma.patientReminder.findFirst({ where: { id: reminderId, nutritionistId } });
  if (!rem) throw new Error("Reminder not found");
  return prisma.patientReminder.update({ where: { id: reminderId }, data: { isActive: !rem.isActive } });
}

export async function deletePatientReminder(nutritionistId: string, reminderId: string) {
  const rem = await prisma.patientReminder.findFirst({ where: { id: reminderId, nutritionistId } });
  if (!rem) throw new Error("Reminder not found");
  return prisma.patientReminder.delete({ where: { id: reminderId } });
}

export function nextSendAtFromFrequency(frequency: ReminderFrequency, from = new Date()): Date {
  const d = new Date(from);
  switch (frequency) {
    case "DAILY":     d.setDate(d.getDate() + 1); break;
    case "WEEKLY":    d.setDate(d.getDate() + 7); break;
    case "BIWEEKLY":  d.setDate(d.getDate() + 14); break;
    case "MONTHLY":   d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}
