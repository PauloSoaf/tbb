import { prisma } from "@/lib/prisma";
import { CareSessionStatus, CareSessionMode, CareSessionProvider } from "@prisma/client";

export async function createCareSession(
  nutritionistId: string,
  patientId: string,
  data: {
    title?: string;
    mode?: CareSessionMode;
    appointmentId?: string;
    roomUrl?: string;
    roomProvider?: string;
    provider?: CareSessionProvider | string;
  }
) {
  return prisma.careSession.create({
    data: {
      nutritionistId,
      patientId,
      title: data.title,
      mode: data.mode ?? "VIDEO",
      appointmentId: data.appointmentId,
      roomUrl: data.roomUrl,
      roomProvider: data.roomProvider ?? (data.roomUrl ? "jitsi" : null),
      provider: (data.provider as CareSessionProvider) ?? "NATIVE_WEBRTC",
    },
    include: { patient: true, appointment: true },
  });
}

export async function getCareSessions(nutritionistId: string, patientId?: string) {
  return prisma.careSession.findMany({
    where: { nutritionistId, ...(patientId ? { patientId } : {}) },
    include: { patient: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCareSession(nutritionistId: string, sessionId: string) {
  return prisma.careSession.findFirst({
    where: { id: sessionId, nutritionistId },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      appointment: true,
      messages: { orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function updateCareSessionStatus(
  nutritionistId: string,
  sessionId: string,
  status: CareSessionStatus
) {
  const data: Record<string, unknown> = { status };
  if (status === "IN_PROGRESS") data.startedAt = new Date();
  if (status === "COMPLETED" || status === "CANCELED") data.endedAt = new Date();

  return prisma.careSession.update({
    where: { id: sessionId, nutritionistId },
    data,
  });
}

export async function updateCareSessionNotes(
  nutritionistId: string,
  sessionId: string,
  notes: { notes?: string; clinicalSummary?: string; patientInstructions?: string }
) {
  return prisma.careSession.update({
    where: { id: sessionId, nutritionistId },
    data: notes,
  });
}

export async function joinCareSession(
  sessionId: string,
  actor: "NUTRITIONIST" | "PATIENT"
) {
  const data =
    actor === "NUTRITIONIST"
      ? { nutritionistJoinedAt: new Date() }
      : { patientJoinedAt: new Date() };
  return prisma.careSession.update({ where: { id: sessionId }, data });
}

export async function getCareSessionMessages(nutritionistId: string, sessionId: string) {
  return prisma.careSessionMessage.findMany({
    where: { careSessionId: sessionId, nutritionistId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendCareSessionMessage(
  nutritionistId: string,
  careSessionId: string,
  patientId: string,
  sender: "NUTRITIONIST" | "PATIENT",
  body: string
) {
  return prisma.careSessionMessage.create({
    data: { nutritionistId, careSessionId, patientId, sender, body },
  });
}

export async function getPatientCareSessions(patientId: string, nutritionistId: string) {
  return prisma.careSession.findMany({
    where: { patientId, nutritionistId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}
