"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import {
  createCareSession,
  getCareSessions,
  getCareSession,
  updateCareSessionStatus,
  updateCareSessionNotes,
  joinCareSession,
  getCareSessionMessages,
  sendCareSessionMessage,
  getPatientCareSessions,
} from "@/services/care-session.service";
import { CareSessionMode, CareSessionStatus } from "@prisma/client";
import { getVideoProvider } from "@/services/video/video-provider-registry";
import type { CareSessionProviderEnum } from "@/services/video/video-provider.types";
import { prisma } from "@/lib/prisma";

// ─── Nutritionist actions ─────────────────────────────────────────────────────

export async function createCareSessionAction(
  tenantSlug: string,
  patientId: string,
  data: {
    title?: string;
    mode?: CareSessionMode;
    appointmentId?: string;
    roomUrl?: string;
    provider?: CareSessionProviderEnum;
  }
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const careSession = await createCareSession(session.nutritionistId, patientId, data);

    // Initialize video room via provider registry
    const providerKey: CareSessionProviderEnum = data.provider ?? "NATIVE_WEBRTC";
    const videoProvider = getVideoProvider(providerKey);
    const roomResult = await videoProvider.createRoom({
      nutritionistId: session.nutritionistId,
      patientId,
      careSessionId: careSession.id,
      title: data.title,
      externalUrl: data.roomUrl,
    });

    // Update session with room fields
    const updated = await prisma.careSession.update({
      where: { id: careSession.id },
      data: {
        provider: roomResult.provider,
        roomId: roomResult.roomId,
        roomUrl: roomResult.roomUrl,
        externalMeetingUrl: roomResult.externalMeetingUrl,
        googleMeetSpaceName: roomResult.googleMeetSpaceName,
        googleMeetUri: roomResult.googleMeetUri,
        googleMeetMeetingCode: roomResult.googleMeetMeetingCode,
        nativeRoomName: roomResult.nativeRoomName,
        nativeSignalChannel: roomResult.nativeSignalChannel,
      },
      include: { patient: true, appointment: true },
    });

    return { success: true, careSession: updated };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getCareSessionsAction(tenantSlug: string, patientId?: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const sessions = await getCareSessions(session.nutritionistId, patientId);
    return { success: true, sessions };
  } catch (e) {
    return { success: false, error: (e as Error).message, sessions: [] };
  }
}

export async function getCareSessionAction(tenantSlug: string, sessionId: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const careSession = await getCareSession(session.nutritionistId, sessionId);
    if (!careSession) return { success: false, error: "Atendimento não encontrado." };
    return { success: true, careSession };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateCareSessionStatusAction(
  tenantSlug: string,
  sessionId: string,
  status: CareSessionStatus
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const careSession = await updateCareSessionStatus(session.nutritionistId, sessionId, status);
    return { success: true, careSession };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateCareSessionNotesAction(
  tenantSlug: string,
  sessionId: string,
  notes: { notes?: string; clinicalSummary?: string; patientInstructions?: string }
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const careSession = await updateCareSessionNotes(session.nutritionistId, sessionId, notes);
    return { success: true, careSession };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getCareSessionMessagesAction(tenantSlug: string, sessionId: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const messages = await getCareSessionMessages(session.nutritionistId, sessionId);
    return { success: true, messages };
  } catch (e) {
    return { success: false, error: (e as Error).message, messages: [] };
  }
}

export async function sendNutritionistCareMessageAction(
  tenantSlug: string,
  careSessionId: string,
  patientId: string,
  body: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const message = await sendCareSessionMessage(
      session.nutritionistId,
      careSessionId,
      patientId,
      "NUTRITIONIST",
      body
    );
    return { success: true, message };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Patient actions ──────────────────────────────────────────────────────────

async function assertPatientCareAccess(tenantSlug: string) {
  const patientSession = await getPatientSessionFromCookies();
  if (!patientSession || patientSession.nutritionistSlug !== tenantSlug) {
    throw new Error("Acesso não autorizado.");
  }
  return patientSession;
}

export async function getPatientCareSessionsAction(tenantSlug: string) {
  try {
    const ps = await assertPatientCareAccess(tenantSlug);
    const sessions = await getPatientCareSessions(ps.patientId, ps.nutritionistId);
    return { success: true, sessions };
  } catch (e) {
    return { success: false, error: (e as Error).message, sessions: [] };
  }
}

export async function joinCareSessionAsPatientAction(tenantSlug: string, sessionId: string) {
  try {
    await assertPatientCareAccess(tenantSlug);
    await joinCareSession(sessionId, "PATIENT");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function joinCareSessionAsNutritionistAction(tenantSlug: string, sessionId: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    await joinCareSession(sessionId, "NUTRITIONIST");
    // Mark as IN_PROGRESS when nutritionist joins
    await updateCareSessionStatus(session.nutritionistId, sessionId, "IN_PROGRESS");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function sendPatientCareMessageAction(
  tenantSlug: string,
  careSessionId: string,
  body: string
) {
  try {
    const ps = await assertPatientCareAccess(tenantSlug);
    const message = await sendCareSessionMessage(
      ps.nutritionistId,
      careSessionId,
      ps.patientId,
      "PATIENT",
      body
    );
    return { success: true, message };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
