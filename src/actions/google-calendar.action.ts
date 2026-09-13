"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { disconnectGoogleCalendar, createCalendarEvent } from "@/services/google-calendar.service";
import { prisma } from "@/lib/prisma";
import { invalidateConfig } from "@/lib/cache/invalidate-nutriopus-cache";

export async function disconnectGoogleCalendarAction(tenantSlug: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  try {
    await disconnectGoogleCalendar(session.nutritionistId);
    invalidateConfig({ nutritionistId: session.nutritionistId, tenant: tenantSlug });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao desconectar" };
  }
}

export async function getGoogleCalendarStatusAction(tenantSlug: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  const nutritionist = await prisma.nutritionist.findUnique({
    where: { id: session.nutritionistId },
    select: { googleAccessToken: true, googleCalendarId: true, googleTokenExpiresAt: true },
  });
  return {
    connected: !!nutritionist?.googleAccessToken,
    calendarId: nutritionist?.googleCalendarId ?? null,
    expiresAt: nutritionist?.googleTokenExpiresAt ?? null,
  };
}

export async function syncAppointmentToCalendarAction(tenantSlug: string, appointmentId: string) {
  const { session } = await assertTenantAccess(tenantSlug);
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, nutritionistId: session.nutritionistId },
    include: { patient: { select: { name: true, email: true } } },
  });
  if (!appt) return { success: false, error: "Consulta não encontrada" };

  const startDate = new Date(appt.date);
  if (appt.startTime) {
    const [h, m] = appt.startTime.split(":").map(Number);
    startDate.setHours(h, m, 0, 0);
  }
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const result = await createCalendarEvent(session.nutritionistId, {
    summary: `Consulta — ${appt.patient.name}`,
    description: appt.notes ?? undefined,
    startDateTime: startDate,
    endDateTime: endDate,
    attendeeEmail: appt.patient.email ?? undefined,
  });

  return result;
}
