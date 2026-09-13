"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";
import { invalidatePatientDetail } from "@/lib/cache/invalidate-nutriopus-cache";

export async function createPatientTagAction(
  tenantSlug: string,
  patientId: string,
  label: string,
  color: string
) {
  const { session } = await assertTenantAccess(tenantSlug);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId: session.nutritionistId },
    select: { id: true },
  });
  if (!patient) return { success: false, error: "Paciente não encontrado" };

  const trimmed = label.trim();
  if (!trimmed) return { success: false, error: "Label inválido" };

  const existing = await prisma.patientTag.findFirst({
    where: { patientId, nutritionistId: session.nutritionistId, label: trimmed },
  });
  if (existing) return { success: false, error: "Tag já existe para este paciente" };

  await prisma.patientTag.create({
    data: {
      patientId,
      nutritionistId: session.nutritionistId,
      label: trimmed,
      color: color || "#6366f1",
    },
  });

  invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
  return { success: true };
}

export async function deletePatientTagAction(
  tenantSlug: string,
  tagId: string,
  patientId: string
) {
  const { session } = await assertTenantAccess(tenantSlug);

  await prisma.patientTag.deleteMany({
    where: { id: tagId, nutritionistId: session.nutritionistId },
  });

  invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
  return { success: true };
}
