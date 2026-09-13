"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";

export async function exportPatientDataAction(tenantSlug: string, patientId: string) {
  const { session } = await assertTenantAccess(tenantSlug);

  try {
    const [patient, measurements, skinfoldsRaw, goals, appointments, notes, anamneses, mealPlans] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, nutritionistId: session.nutritionistId },
        select: { name: true, email: true, phone: true, birthDate: true, goal: true, createdAt: true },
      }),
      prisma.patientMeasurement.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { measuredAt: "desc" },
      }),
      prisma.skinfoldAssessment.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { assessedAt: "desc" },
      }),
      prisma.patientGoal.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { createdAt: "desc" },
        include: { checkIns: { orderBy: { checkedAt: "desc" } } },
      }),
      prisma.appointment.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { date: "desc" },
      }),
      prisma.patientNote.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { createdAt: "desc" },
        include: { tags: { include: { tag: true } } },
      }),
      prisma.anamneseResponse.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.mealPlan.findMany({
        where: { patientId, nutritionistId: session.nutritionistId },
        orderBy: { createdAt: "desc" },
        include: { meals: { include: { items: true } } },
      }),
    ]);

    if (!patient) throw new Error("Paciente não encontrado ou acesso negado.");

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      tenant: tenantSlug,
      patientInfo: { ...patient },
      measurements,
      skinfolds: skinfoldsRaw,
      goals,
      appointments,
      clinicalNotes: notes,
      anamnesis: anamneses,
      mealPlans,
    };

    return { data: exportData };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro desconhecido ao exportar dados." };
  }
}
