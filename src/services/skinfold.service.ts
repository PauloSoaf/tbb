import { prisma } from "@/lib/prisma";
import { calculateSkinfold, type Protocol, type SkinfoldInput } from "@/lib/skinfold/protocols";
import type { SkinfoldProtocol } from "@prisma/client";

export async function createSkinfoldAssessment(
  nutritionistId: string,
  patientId: string,
  input: SkinfoldInput & { protocol: Protocol; notes?: string; assessedAt?: Date }
) {
  const result = calculateSkinfold(input.protocol, input);

  return prisma.skinfoldAssessment.create({
    data: {
      nutritionistId,
      patientId,
      protocol: input.protocol as SkinfoldProtocol,
      age: input.age,
      sex: input.sex,
      chest: input.chest,
      axillary: input.axillary,
      triceps: input.triceps,
      subscapular: input.subscapular,
      abdominal: input.abdominal,
      suprailiac: input.suprailiac,
      thigh: input.thigh,
      medialCalf: input.medialCalf,
      weight: input.weight,
      bodyDensity: result.bodyDensity,
      bodyFatPct: result.bodyFatPct,
      bodyFatKg: result.bodyFatKg,
      leanMassKg: result.leanMassKg,
      notes: input.notes,
      assessedAt: input.assessedAt ?? new Date(),
    },
  });
}

export async function getSkinfoldAssessments(nutritionistId: string, patientId: string) {
  return prisma.skinfoldAssessment.findMany({
    where: { nutritionistId, patientId },
    orderBy: { assessedAt: "desc" },
  });
}

export async function getSkinfoldAssessment(nutritionistId: string, id: string) {
  return prisma.skinfoldAssessment.findFirst({ where: { id, nutritionistId } });
}

export async function deleteSkinfoldAssessment(nutritionistId: string, id: string) {
  const rec = await prisma.skinfoldAssessment.findFirst({ where: { id, nutritionistId } });
  if (!rec) throw new Error("Assessment not found");
  return prisma.skinfoldAssessment.delete({ where: { id } });
}
