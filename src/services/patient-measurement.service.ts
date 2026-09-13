import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type CreateMeasurementInput = Omit<
  Prisma.PatientMeasurementCreateInput,
  "id" | "createdAt" | "updatedAt" | "nutritionist" | "patient"
>;

export type UpdateMeasurementInput = Partial<CreateMeasurementInput>;

export async function createPatientMeasurement(
  nutritionistId: string,
  patientId: string,
  data: CreateMeasurementInput
) {
  // Validate patient belongs to tenant
  const patient = await prisma.patient.findUnique({
    where: { id: patientId, nutritionistId },
  });

  if (!patient) {
    throw new Error("Paciente não encontrado ou não autorizado.");
  }

  return prisma.patientMeasurement.create({
    data: {
      ...data,
      nutritionist: { connect: { id: nutritionistId } },
      patient: { connect: { id: patientId } },
    },
  });
}

export async function updatePatientMeasurement(
  nutritionistId: string,
  patientId: string,
  measurementId: string,
  data: UpdateMeasurementInput
) {
  const measurement = await prisma.patientMeasurement.findFirst({
    where: { id: measurementId, nutritionistId, patientId },
  });

  if (!measurement) {
    throw new Error("Avaliação não encontrada ou não autorizada.");
  }

  return prisma.patientMeasurement.update({
    where: { id: measurementId },
    data,
  });
}

export async function getPatientMeasurementsByPatient(
  nutritionistId: string,
  patientId: string
) {
  return prisma.patientMeasurement.findMany({
    where: { patientId, nutritionistId },
    orderBy: { measuredAt: "desc" },
  });
}

export async function getPatientMeasurementById(
  nutritionistId: string,
  measurementId: string
) {
  return prisma.patientMeasurement.findFirst({
    where: { id: measurementId, nutritionistId },
  });
}

export async function getLatestPatientMeasurement(
  nutritionistId: string,
  patientId: string
) {
  return prisma.patientMeasurement.findFirst({
    where: { patientId, nutritionistId },
    orderBy: { measuredAt: "desc" },
  });
}

export async function getFirstPatientMeasurement(
  nutritionistId: string,
  patientId: string
) {
  return prisma.patientMeasurement.findFirst({
    where: { patientId, nutritionistId },
    orderBy: { measuredAt: "asc" },
    select: { weight: true, bodyFatPercentage: true, bmi: true, measuredAt: true },
  });
}

export async function getAnthropometryEvolutionData(
  nutritionistId: string,
  patientId: string
) {
  // Fetch ordered chronologically for charts (oldest first)
  const measurements = await prisma.patientMeasurement.findMany({
    where: { patientId, nutritionistId },
    orderBy: { measuredAt: "asc" },
    select: {
      measuredAt: true,
      weight: true,
      bmi: true,
      bodyFatPercentage: true,
      leanMassKg: true,
    },
  });

  return measurements;
}
