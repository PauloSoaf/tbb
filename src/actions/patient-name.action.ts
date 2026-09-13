"use server";

import { getSessionFromCookies } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";

export async function getPatientNameAction(patientId: string): Promise<string | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId: session.nutritionistId },
    select: { name: true },
  });

  return patient?.name ?? null;
}
