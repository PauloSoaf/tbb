import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createPatientSession } from "@/lib/auth/patient-session";
import { randomBytes } from "crypto";
import { FoodDiaryMeal } from "@prisma/client";
import { buildPatientPortalSlug } from "@/lib/utils/patientPortalRoute";

const FOOD_DIARY_MEALS = new Set<string>(Object.values(FoodDiaryMeal));

function toFoodDiaryMeal(meal: string): FoodDiaryMeal {
  if (FOOD_DIARY_MEALS.has(meal)) {
    return meal as FoodDiaryMeal;
  }
  return FoodDiaryMeal.OTHER;
}

export async function generateActivationLink(
  nutritionistId: string,
  patientId: string,
  baseUrl: string
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
    include: { nutritionist: true },
  });
  if (!patient) throw new Error("Paciente não encontrado.");
  if (!patient.email) throw new Error("O paciente não possui e-mail cadastrado.");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

  await prisma.patientAccount.upsert({
    where: { patientId },
    update: {
      activationToken: token,
      activationTokenExpiresAt: expiresAt,
      status: "PENDING",
    },
    create: {
      patientId,
      nutritionistId,
      email: patient.email,
      passwordHash: "",
      activationToken: token,
      activationTokenExpiresAt: expiresAt,
      status: "PENDING",
    },
  });

  const slug = patient.nutritionist.slug;
  return `${baseUrl}/portal/${slug}/ativar-acesso?token=${token}`;
}

export async function activatePatientAccount(token: string, password: string) {
  const account = await prisma.patientAccount.findUnique({
    where: { activationToken: token },
    include: { patient: { include: { nutritionist: true } } },
  });

  if (!account) throw new Error("Token inválido.");
  if (!account.activationTokenExpiresAt || account.activationTokenExpiresAt < new Date()) {
    throw new Error("Token expirado. Solicite um novo link à sua nutricionista.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      passwordHash,
      status: "ACTIVE",
      activationToken: null,
      activationTokenExpiresAt: null,
      activatedAt: new Date(),
    },
  });

  const slug = account.patient.nutritionist.slug;
  return { success: true, slug };
}

export async function authenticatePatient(
  tenantSlug: string,
  email: string,
  password: string
) {
  const nutritionist = await prisma.nutritionist.findUnique({
    where: { slug: tenantSlug },
  });
  if (!nutritionist) return { success: false, error: "Nutricionista não encontrada." };

  const account = await prisma.patientAccount.findFirst({
    where: { email, nutritionistId: nutritionist.id, status: "ACTIVE" },
    include: { patient: true },
  });

  if (!account) return { success: false, error: "E-mail ou senha inválidos." };

  const valid = await verifyPassword(password, account.passwordHash);
  if (!valid) return { success: false, error: "E-mail ou senha inválidos." };

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createPatientSession({
    patientAccountId: account.id,
    patientId: account.patientId,
    nutritionistId: nutritionist.id,
    nutritionistSlug: tenantSlug,
  });

  return { success: true, token, patientSlug: buildPatientPortalSlug(account.patient) };
}

export async function getPortalPatient(patientId: string, nutritionistId: string) {
  return prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
    include: {
      mealPlans: {
        where: { status: "ACTIVE", isTemplate: false },
        include: { meals: { include: { items: true }, orderBy: { position: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      anamneseResponses: { orderBy: { submittedAt: "desc" }, take: 3 },
      patientMeasurements: { orderBy: { measuredAt: "desc" }, take: 10 },
      appointments: {
        orderBy: { date: "desc" },
        take: 20,
      },
      documents: {
        where: { visibleToPatient: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getPatientFoodDiary(patientId: string, nutritionistId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return prisma.foodDiaryEntry.findMany({
    where: { patientId, nutritionistId, loggedAt: { gte: since } },
    orderBy: { loggedAt: "desc" },
  });
}

export async function addFoodDiaryEntry(
  patientId: string,
  nutritionistId: string,
  data: {
    meal: string;
    foodName: string;
    quantity?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    hunger?: number;
    satiety?: number;
    mood?: string;
    notes?: string;
  }
) {
  return prisma.foodDiaryEntry.create({
    data: {
      patientId,
      nutritionistId,
      meal: toFoodDiaryMeal(data.meal),
      foodName: data.foodName,
      quantity: data.quantity,
      unit: data.unit,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      hunger: data.hunger,
      satiety: data.satiety,
      mood: data.mood,
      notes: data.notes,
    },
  });
}

export async function deleteFoodDiaryEntry(patientId: string, entryId: string) {
  return prisma.foodDiaryEntry.deleteMany({
    where: { id: entryId, patientId },
  });
}

export async function getChatMessages(patientId: string, nutritionistId: string) {
  return prisma.chatMessage.findMany({
    where: { patientId, nutritionistId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendChatMessage(
  patientId: string,
  nutritionistId: string,
  sender: "PATIENT" | "NUTRITIONIST",
  body: string
) {
  return prisma.chatMessage.create({
    data: { patientId, nutritionistId, sender, body },
  });
}

export async function markMessagesAsRead(patientId: string, nutritionistId: string, sender: "PATIENT" | "NUTRITIONIST") {
  const oppositeSender = sender === "PATIENT" ? "NUTRITIONIST" : "PATIENT";
  await prisma.chatMessage.updateMany({
    where: { patientId, nutritionistId, sender: oppositeSender, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getPatientWeightHistory(patientId: string, nutritionistId: string) {
  return prisma.patientMeasurement.findMany({
    where: { patientId, nutritionistId, weight: { not: null } },
    orderBy: { measuredAt: "desc" },
    take: 30,
    select: { id: true, weight: true, measuredAt: true },
  });
}

export async function addPatientWeight(
  patientId: string,
  nutritionistId: string,
  weight: number,
  measuredAt: Date
) {
  return prisma.patientMeasurement.create({
    data: {
      patientId,
      nutritionistId,
      weight,
      measuredAt,
      source: "MANUAL",
    },
  });
}

export async function getPatientTasksForPortal(patientId: string) {
  return prisma.patientTask.findMany({
    where: { patientId, status: { in: ["PENDING", "IN_PROGRESS", "DONE"] } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true,
      status: true, priority: true, dueDate: true, completedAt: true,
    },
  });
}

export async function completePatientTask(patientId: string, taskId: string) {
  return prisma.patientTask.updateMany({
    where: { id: taskId, patientId },
    data: { status: "DONE", completedAt: new Date() },
  });
}

export async function reopenPatientTask(patientId: string, taskId: string) {
  return prisma.patientTask.updateMany({
    where: { id: taskId, patientId },
    data: { status: "PENDING", completedAt: null },
  });
}

export async function getActiveRemindersForPatient(patientId: string) {
  return prisma.patientReminder.findMany({
    where: { patientId, isActive: true },
    orderBy: { nextSendAt: "asc" },
    select: { id: true, title: true, body: true, frequency: true, nextSendAt: true },
  });
}

export async function getWellnessCheckins(patientId: string, limit = 14) {
  return prisma.wellnessCheckin.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    take: limit,
    select: { id: true, date: true, mood: true, energy: true, sleep: true, notes: true },
  });
}

export async function upsertWellnessCheckin(
  patientId: string,
  nutritionistId: string,
  data: { date: Date; mood: number; energy: number; sleep?: number | null; notes?: string | null }
) {
  return prisma.wellnessCheckin.upsert({
    where: { patientId_date: { patientId, date: data.date } },
    create: { patientId, nutritionistId, ...data },
    update: { mood: data.mood, energy: data.energy, sleep: data.sleep, notes: data.notes },
  });
}
