import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/cookies";

type RouteContext = {
  params: Promise<{ tenant: string }>;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(_request: Request, context: RouteContext) {
  const { tenant } = await context.params;
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (session.nutritionistSlug !== tenant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const reminderLimit = addDays(now, 7);
  const recentAlertStart = startOfDay(subDays(now, 2));

  const [
    reminders,
    todayAppointments,
    newAnamneses,
    unreadMessages,
    recentLowMoodCheckins,
  ] = await Promise.all([
    prisma.patientReminder.findMany({
      where: {
        nutritionistId: session.nutritionistId,
        isActive: true,
        nextSendAt: { lte: reminderLimit },
      },
      select: {
        id: true,
        title: true,
        body: true,
        nextSendAt: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { nextSendAt: "asc" },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: {
        nutritionistId: session.nutritionistId,
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELED" },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        mode: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: "asc" }, { date: "asc" }],
      take: 4,
    }),
    prisma.anamneseResponse.findMany({
      where: { nutritionistId: session.nutritionistId, status: "NEW" },
      select: {
        id: true,
        submittedAt: true,
        attentionPoints: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 4,
    }),
    prisma.chatMessage.findMany({
      where: { nutritionistId: session.nutritionistId, sender: "PATIENT", readAt: null },
      select: {
        id: true,
        body: true,
        createdAt: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.wellnessCheckin.findMany({
      where: {
        nutritionistId: session.nutritionistId,
        date: { gte: recentAlertStart },
        mood: { lte: 2 },
      },
      select: {
        id: true,
        date: true,
        mood: true,
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  const lowMoodByPatient = new Map<string, (typeof recentLowMoodCheckins)[number]>();
  for (const checkin of recentLowMoodCheckins) {
    if (!lowMoodByPatient.has(checkin.patient.id)) lowMoodByPatient.set(checkin.patient.id, checkin);
  }

  const alertItems = [
    ...todayAppointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      type: "appointment" as const,
      tone: "green" as const,
      title: appointment.patient.name,
      description: `${appointment.startTime ?? "Horario a definir"} - ${
        appointment.mode === "ONLINE" ? "Online" : "Presencial"
      }`,
      href: `/dashboard/${tenant}/agenda`,
      at: appointment.date.toISOString(),
    })),
    ...newAnamneses.map((anamnese) => ({
      id: `anamnese-${anamnese.id}`,
      type: "anamnese" as const,
      tone: anamnese.attentionPoints.length > 0 ? ("rose" as const) : ("blue" as const),
      title: anamnese.patient.name,
      description:
        anamnese.attentionPoints.length > 0
          ? `${anamnese.attentionPoints.length} ponto(s) de atencao`
          : "Anamnese nova para revisar",
      href: `/dashboard/${tenant}/anamnese/${anamnese.id}`,
      at: anamnese.submittedAt.toISOString(),
    })),
    ...unreadMessages.map((message) => ({
      id: `message-${message.id}`,
      type: "message" as const,
      tone: "blue" as const,
      title: message.patient.name,
      description: message.body,
      href: `/dashboard/${tenant}/pacientes/${message.patient.id}/chat`,
      at: message.createdAt.toISOString(),
    })),
    ...Array.from(lowMoodByPatient.values()).slice(0, 3).map((checkin) => ({
      id: `mood-${checkin.id}`,
      type: "mood" as const,
      tone: "amber" as const,
      title: checkin.patient.name,
      description: `Check-in recente com humor ${checkin.mood}/5`,
      href: `/dashboard/${tenant}/pacientes/${checkin.patient.id}`,
      at: checkin.date.toISOString(),
    })),
  ].slice(0, 8);

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      reminders: reminders.map((reminder) => ({
        id: reminder.id,
        type: "reminder" as const,
        tone: "amber" as const,
        title: reminder.title,
        description: reminder.body || reminder.patient.name,
        patientName: reminder.patient.name,
        href: `/dashboard/${tenant}/pacientes/${reminder.patient.id}`,
        at: reminder.nextSendAt.toISOString(),
      })),
      alerts: alertItems,
      summary: {
        dueReminders: reminders.length,
        todayAppointments: todayAppointments.length,
        newAnamneses: newAnamneses.length,
        unreadMessages: unreadMessages.length,
        lowMoodAlerts: lowMoodByPatient.size,
        totalOpen: reminders.length + alertItems.length,
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}
