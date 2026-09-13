"use server";

import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { randomBytes } from "crypto";

/**
 * Retorna o calendarToken da nutricionista logada.
 * Se ainda não existir, gera um novo token único e persiste no banco.
 */
export async function getOrCreateCalendarTokenAction(): Promise<{
  token: string | null;
  error?: string;
}> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return { token: null, error: "Não autorizado" };
    }

    const nutritionist = await prisma.nutritionist.findUnique({
      where: { id: session.nutritionistId },
      select: { calendarToken: true },
    });

    if (!nutritionist) {
      return { token: null, error: "Nutricionista não encontrada" };
    }

    // Se já tem token, retorna ele
    if (nutritionist.calendarToken) {
      return { token: nutritionist.calendarToken };
    }

    // Gera um novo token único (32 bytes = 64 hex chars)
    const newToken = randomBytes(32).toString("hex");

    await prisma.nutritionist.update({
      where: { id: session.nutritionistId },
      data: { calendarToken: newToken },
    });

    return { token: newToken };
  } catch (err) {
    console.error("getOrCreateCalendarTokenAction error:", err);
    return { token: null, error: "Erro ao gerar token de calendário" };
  }
}

/**
 * Regenera o calendarToken (invalida o anterior — útil para revogar acesso).
 */
export async function regenerateCalendarTokenAction(): Promise<{
  token: string | null;
  error?: string;
}> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return { token: null, error: "Não autorizado" };
    }

    const newToken = randomBytes(32).toString("hex");

    await prisma.nutritionist.update({
      where: { id: session.nutritionistId },
      data: { calendarToken: newToken },
    });

    return { token: newToken };
  } catch (err) {
    console.error("regenerateCalendarTokenAction error:", err);
    return { token: null, error: "Erro ao regenerar token" };
  }
}
