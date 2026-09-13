import { prisma } from "@/lib/prisma";
import { generateAnamneseSummary } from "@/lib/utils/generateAnamneseSummary";
import { extractAttentionPoints } from "@/lib/utils/extractAttentionPoints";
import { createOrUpdatePatient } from "./patient.service";
import type { AnamneseInput } from "@/validation/anamnese.schema";

function buildAnamneseDerivedData(data: AnamneseInput) {
  const payload = { ...data };

  return {
    payload,
    summary: generateAnamneseSummary(payload),
    attentionPoints: extractAttentionPoints(payload),
  };
}

export async function submitAnamnese(
  nutritionistId: string,
  data: AnamneseInput
) {
  // Create or update patient
  const patient = await createOrUpdatePatient(nutritionistId, {
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    birthDate: data.birthDate || undefined,
    weight: data.weight ? parseFloat(data.weight) : undefined,
    height: data.height ? parseFloat(data.height) : undefined,
    goal: data.goal,
  });

  const { payload, summary, attentionPoints } = buildAnamneseDerivedData(data);

  // Create anamnese response
  const response = await prisma.anamneseResponse.create({
    data: {
      nutritionistId,
      patientId: patient.id,
      payload: JSON.parse(JSON.stringify(payload)),
      summary,
      attentionPoints,
      status: "NEW",
    },
  });

  return { patient, response };
}

export async function createAnamneseForPatient(
  nutritionistId: string,
  patientId: string,
  data: AnamneseInput
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
    select: { id: true },
  });

  if (!patient) {
    throw new Error("Paciente nao encontrado ou nao autorizado.");
  }

  const { payload, summary, attentionPoints } = buildAnamneseDerivedData(data);

  return prisma.anamneseResponse.create({
    data: {
      nutritionistId,
      patientId,
      payload: JSON.parse(JSON.stringify(payload)),
      summary,
      attentionPoints,
      status: "NEW",
    },
  });
}

export async function getAnamneseById(
  nutritionistId: string,
  responseId: string
) {
  return prisma.anamneseResponse.findFirst({
    where: {
      id: responseId,
      nutritionistId,
    },
    include: {
      patient: true,
    },
  });
}

export async function listAnamneses(
  nutritionistId: string,
  limit: number = 10
) {
  return prisma.anamneseResponse.findMany({
    where: { nutritionistId },
    include: { patient: true },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}

export async function updateAnamnese(
  nutritionistId: string,
  responseId: string,
  data: AnamneseInput
) {
  const anamnese = await prisma.anamneseResponse.findFirst({
    where: { id: responseId, nutritionistId },
    select: { id: true, patientId: true },
  });

  if (!anamnese) {
    throw new Error("Anamnese nao encontrada ou nao autorizada.");
  }

  const { payload, summary, attentionPoints } = buildAnamneseDerivedData(data);

  return prisma.anamneseResponse.update({
    where: { id: responseId },
    data: {
      payload: JSON.parse(JSON.stringify(payload)),
      summary,
      attentionPoints,
    },
  });
}

export async function deleteAnamnese(
  nutritionistId: string,
  responseId: string
) {
  const anamnese = await prisma.anamneseResponse.findFirst({
    where: { id: responseId, nutritionistId },
    select: { id: true, patientId: true },
  });

  if (!anamnese) {
    throw new Error("Anamnese nao encontrada ou nao autorizada.");
  }

  await prisma.anamneseResponse.delete({
    where: { id: responseId },
  });

  return { patientId: anamnese.patientId };
}

export async function markAsReviewed(
  nutritionistId: string,
  responseId: string
) {
  const anamnese = await prisma.anamneseResponse.findFirst({
    where: {
      id: responseId,
      nutritionistId,
    },
  });

  if (!anamnese) {
    return { success: false, error: "Anamnese não encontrada" };
  }

  await prisma.anamneseResponse.update({
    where: { id: responseId },
    data: { status: "REVIEWED" },
  });

  return { success: true };
}
