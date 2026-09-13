"use server";

import { cookies, headers } from "next/headers";
import {
  invalidatePortalDiary,
  invalidatePortalEvolution,
  invalidatePortalTasks,
  invalidatePortalCheckin,
  invalidateAfterChatMessage,
  invalidatePatientDetail,
  invalidateDashboard,
} from "@/lib/cache/invalidate-nutriopus-cache";
import { getPatientSessionFromCookies, createPatientSessionCookie, createPatientLogoutCookie } from "@/lib/auth/patient-cookies";
import * as portalService from "@/services/patient-portal.service";

type ActionResult<T = Record<string, never>> =
  | ({ success: true } & T)
  | { success: false; error: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function assertPatientAccess(tenantSlug: string) {
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenantSlug) {
    throw new Error("Acesso não autorizado.");
  }
  return session;
}

export async function loginPatientAction(
  tenantSlug: string,
  email: string,
  password: string
): Promise<ActionResult<{ patientSlug: string }>> {
  try {
    const result = await portalService.authenticatePatient(tenantSlug, email, password);
    if (!result.success || !result.token || !result.patientSlug) {
      const error = result.success ? "Erro ao fazer login." : (result.error ?? "Erro ao fazer login.");
      return { success: false, error };
    }
    const cookieStore = await cookies();
    const cookie = createPatientSessionCookie(result.token);
    cookieStore.set(cookie.name, cookie.value, cookie);
    return { success: true, patientSlug: result.patientSlug };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao fazer login.") };
  }
}

export async function logoutPatientAction() {
  const cookieStore = await cookies();
  const cookie = createPatientLogoutCookie();
  cookieStore.set(cookie.name, cookie.value, cookie);
  return { success: true };
}

export async function activatePatientAccountAction(
  token: string,
  password: string
): Promise<ActionResult<{ slug: string }>> {
  try {
    const result = await portalService.activatePatientAccount(token, password);
    return { success: true, slug: result.slug };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao ativar conta.") };
  }
}

export async function generateActivationLinkAction(tenantSlug: string, patientId: string) {
  try {
    // This is called from the nutritionist dashboard, so check nutritionist session instead
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const nutritionistSession = await getSessionFromCookies();
    if (!nutritionistSession || nutritionistSession.nutritionistSlug !== tenantSlug) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const headerStore = await headers();
    const host = headerStore.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;
    const link = await portalService.generateActivationLink(
      nutritionistSession.nutritionistId,
      patientId,
      baseUrl
    );
    return { success: true, link };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao gerar link.") };
  }
}

export async function resendActivationLinkAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const nutritionistSession = await getSessionFromCookies();
    if (!nutritionistSession || nutritionistSession.nutritionistSlug !== tenantSlug) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const { prisma } = await import("@/lib/prisma");
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: nutritionistSession.nutritionistId },
      include: { nutritionist: { select: { name: true, slug: true } } },
    });
    if (!patient) return { success: false, error: "Paciente não encontrado." };
    if (!patient.email) return { success: false, error: "Paciente sem e-mail cadastrado." };

    const headerStore = await headers();
    const host = headerStore.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const activationUrl = await portalService.generateActivationLink(
      nutritionistSession.nutritionistId,
      patientId,
      baseUrl
    );

    const { sendWelcomePatientEmail } = await import("@/services/email.service");
    await sendWelcomePatientEmail({
      patientEmail: patient.email,
      patientName: patient.name,
      nutritionistName: patient.nutritionist.name,
      tenantSlug: patient.nutritionist.slug,
      activationUrl,
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao reenviar link.") };
  }
}

export async function getPortalPatientAction(tenantSlug: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const patient = await portalService.getPortalPatient(session.patientId, session.nutritionistId);
    return { success: true, patient };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao carregar portal.") };
  }
}

export async function getFoodDiaryAction(tenantSlug: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const entries = await portalService.getPatientFoodDiary(session.patientId, session.nutritionistId);
    return { success: true, entries };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao carregar diÃ¡rio alimentar.") };
  }
}

export async function addFoodDiaryEntryAction(
  tenantSlug: string,
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
  try {
    const session = await assertPatientAccess(tenantSlug);
    const entry = await portalService.addFoodDiaryEntry(session.patientId, session.nutritionistId, data);
    invalidatePortalDiary({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true, entry };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao registrar refeiÃ§Ã£o.") };
  }
}

export async function getChatMessagesAction(tenantSlug: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const messages = await portalService.getChatMessages(session.patientId, session.nutritionistId);
    await portalService.markMessagesAsRead(session.patientId, session.nutritionistId, "PATIENT");
    return { success: true, messages };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao carregar mensagens.") };
  }
}

export async function sendPatientMessageAction(tenantSlug: string, body: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const message = await portalService.sendChatMessage(session.patientId, session.nutritionistId, "PATIENT", body);
    invalidateAfterChatMessage({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId: session.patientId, portalPatientId: session.patientId, portalTenant: tenantSlug });
    return { success: true, message };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao enviar mensagem.") };
  }
}

export async function getNutritionistChatAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const nutritionistSession = await getSessionFromCookies();
    if (!nutritionistSession || nutritionistSession.nutritionistSlug !== tenantSlug) {
      return { success: false as const, error: "Acesso não autorizado.", messages: [] };
    }
    const messages = await portalService.getChatMessages(patientId, nutritionistSession.nutritionistId);
    return { success: true as const, messages };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao buscar mensagens."), messages: [] };
  }
}

export async function sendNutritionistMessageAction(tenantSlug: string, patientId: string, body: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const nutritionistSession = await getSessionFromCookies();
    if (!nutritionistSession || nutritionistSession.nutritionistSlug !== tenantSlug) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const message = await portalService.sendChatMessage(patientId, nutritionistSession.nutritionistId, "NUTRITIONIST", body);
    invalidateAfterChatMessage({ nutritionistId: nutritionistSession.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true, message };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao enviar mensagem.") };
  }
}

export async function markNutritionistChatReadAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const nutritionistSession = await getSessionFromCookies();
    if (!nutritionistSession || nutritionistSession.nutritionistSlug !== tenantSlug) return;
    await portalService.markMessagesAsRead(patientId, nutritionistSession.nutritionistId, "NUTRITIONIST");
    invalidateDashboard({ nutritionistId: nutritionistSession.nutritionistId, tenant: tenantSlug });
  } catch {
    // Fire and forget — não bloqueia o chat
  }
}

export async function deleteFoodDiaryEntryAction(tenantSlug: string, entryId: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    await portalService.deleteFoodDiaryEntry(session.patientId, entryId);
    invalidatePortalDiary({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao excluir entrada.") };
  }
}

export async function getPatientWeightHistoryAction(tenantSlug: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const data = await portalService.getPatientWeightHistory(session.patientId, session.nutritionistId);
    return { success: true as const, data };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao buscar histórico.") };
  }
}

export async function addPatientWeightAction(
  tenantSlug: string,
  weight: number,
  measuredAt: Date
) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const result = await portalService.addPatientWeight(
      session.patientId,
      session.nutritionistId,
      weight,
      measuredAt
    );
    invalidatePortalEvolution({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true, measurement: result };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Erro ao registrar peso.") };
  }
}

export async function completePatientTaskAction(tenantSlug: string, taskId: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    await portalService.completePatientTask(session.patientId, taskId);
    invalidatePortalTasks({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao concluir tarefa.") };
  }
}

export async function reopenPatientTaskAction(tenantSlug: string, taskId: string) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    await portalService.reopenPatientTask(session.patientId, taskId);
    invalidatePortalTasks({ patientId: session.patientId, tenant: tenantSlug });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao reabrir tarefa.") };
  }
}

export async function submitWellnessCheckinAction(
  tenantSlug: string,
  data: { mood: number; energy: number; sleep?: number | null; notes?: string | null }
) {
  try {
    const session = await assertPatientAccess(tenantSlug);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await portalService.upsertWellnessCheckin(session.patientId, session.nutritionistId, {
      date: today,
      ...data,
    });
    invalidatePortalCheckin({ patientId: session.patientId, tenant: tenantSlug, nutritionistId: session.nutritionistId });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao registrar check-in.") };
  }
}

export async function createPortalAccountAdminAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const session = await getSessionFromCookies();
    if (!session || session.nutritionistSlug !== tenantSlug) {
      return { success: false as const, error: "Acesso não autorizado." };
    }
    
    const { prisma } = await import("@/lib/prisma");
    const { hashPassword } = await import("@/lib/auth/password");
    
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: session.nutritionistId },
    });
    if (!patient) return { success: false as const, error: "Paciente não encontrado." };
    if (!patient.email) return { success: false as const, error: "Paciente sem e-mail cadastrado." };
    
    const passwordHash = await hashPassword('123456');
    
    await prisma.patientAccount.upsert({
      where: { patientId },
      update: {
        passwordHash,
        status: "ACTIVE",
        activatedAt: new Date(),
        activationToken: null,
        activationTokenExpiresAt: null
      },
      create: {
        patientId,
        nutritionistId: session.nutritionistId,
        email: patient.email,
        passwordHash,
        status: "ACTIVE",
        activatedAt: new Date()
      },
    });
    
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao criar conta.") };
  }
}

export async function archivePortalAccountAdminAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const session = await getSessionFromCookies();
    if (!session || session.nutritionistSlug !== tenantSlug) {
      return { success: false as const, error: "Acesso não autorizado." };
    }
    
    const { prisma } = await import("@/lib/prisma");
    await prisma.patientAccount.updateMany({
      where: { patientId, nutritionistId: session.nutritionistId },
      data: { status: "BLOCKED" },
    });
    
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao arquivar conta.") };
  }
}

export async function deletePortalAccountAdminAction(tenantSlug: string, patientId: string) {
  try {
    const { getSessionFromCookies } = await import("@/lib/auth/cookies");
    const session = await getSessionFromCookies();
    if (!session || session.nutritionistSlug !== tenantSlug) {
      return { success: false as const, error: "Acesso não autorizado." };
    }
    
    const { prisma } = await import("@/lib/prisma");
    await prisma.patientAccount.deleteMany({
      where: { patientId, nutritionistId: session.nutritionistId },
    });
    
    invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId });
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error, "Erro ao excluir conta.") };
  }
}
