"use server";

import { requirePermission } from "@/lib/tenancy/requirePermission";
import { appointmentSchema } from "@/validation/appointment.schema";
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
} from "@/services/appointment.service";
import { createCalendarEvent, getValidAccessToken } from "@/services/google-calendar.service";
import { sendAppointmentConfirmEmail } from "@/services/email.service";
import { prisma } from "@/lib/prisma";
import { invalidateAfterAppointmentMutation } from "@/lib/cache/invalidate-nutriopus-cache";

async function requireAppointmentPermission(action: string, tenantSlug: string) {
  try {
    return await requirePermission("appointments", action, tenantSlug, { throwOnFailure: true });
  } catch {
    return null;
  }
}

export async function createAppointmentAction(
  tenantSlug: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const session = await requireAppointmentPermission("create", tenantSlug);
  if (!session) {
    return { error: "Não autorizado." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = appointmentSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  try {
    const appt = await createAppointment(session.nutritionistId, {
      patientId: data.patientId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || undefined,
      mode: data.mode,
      status: data.status,
      notes: data.notes || undefined,
    });

    // Fire-and-forget side effects: Google Calendar sync + email confirmation
    void (async () => {
      try {
        const [patient, nutritionist] = await Promise.all([
          prisma.patient.findUnique({
            where: { id: data.patientId },
            select: { name: true, email: true },
          }),
          prisma.nutritionist.findUnique({
            where: { id: session.nutritionistId },
            select: { name: true, slug: true, googleAccessToken: true },
          }),
        ]);
        if (!patient || !nutritionist) return;

        if (nutritionist.googleAccessToken) {
          const token = await getValidAccessToken(session.nutritionistId);
          if (token) {
            const startDate = new Date(data.date);
            if (data.startTime) {
              const [h, m] = data.startTime.split(":").map(Number);
              startDate.setHours(h, m, 0, 0);
            }
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            await createCalendarEvent(session.nutritionistId, {
              summary: `Consulta — ${patient.name}`,
              description: data.notes || undefined,
              startDateTime: startDate,
              endDateTime: endDate,
              attendeeEmail: patient.email ?? undefined,
            }).catch(() => {});
          }
        }

        if (patient.email) {
          const dateFormatted = new Date(data.date).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
          await sendAppointmentConfirmEmail({
            patientEmail: patient.email,
            patientName: patient.name,
            nutritionistName: nutritionist.name,
            date: dateFormatted,
            time: data.startTime || undefined,
            mode: data.mode,
            tenantSlug: nutritionist.slug,
          }).catch(() => {});
        }
      } catch {
        // Side effects must never block appointment creation
      }
    })();

    invalidateAfterAppointmentMutation({
      nutritionistId: session.nutritionistId,
      tenant: tenantSlug,
      patientId: data.patientId,
    });

    return { success: true, appointmentId: appt.id };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao criar consulta. Tente novamente." };
  }
}

export async function updateAppointmentStatusAction(
  tenantSlug: string,
  appointmentId: string,
  status: "SCHEDULED" | "DONE" | "CANCELED"
) {
  const session = await requireAppointmentPermission(status === "CANCELED" ? "cancel" : "edit", tenantSlug);
  if (!session) {
    return { error: "Não autorizado." };
  }

  try {
    await updateAppointmentStatus(session.nutritionistId, appointmentId, status);
    invalidateAfterAppointmentMutation({
      nutritionistId: session.nutritionistId,
      tenant: tenantSlug,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao atualizar consulta." };
  }
}

export async function deleteAppointmentAction(
  tenantSlug: string,
  appointmentId: string
) {
  const session = await requireAppointmentPermission("cancel", tenantSlug);
  if (!session) {
    return { error: "Não autorizado." };
  }

  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, nutritionistId: session.nutritionistId },
    });
    if (!existing) return { error: "Consulta não encontrada." };

    await prisma.appointment.delete({ where: { id: appointmentId } });

    invalidateAfterAppointmentMutation({
      nutritionistId: session.nutritionistId,
      tenant: tenantSlug,
      patientId: existing.patientId ?? undefined,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Erro ao excluir consulta." };
  }
}

export async function updateAppointmentAction(
  tenantSlug: string,
  appointmentId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const session = await requireAppointmentPermission("edit", tenantSlug);
  if (!session) {
    return { error: "Não autorizado." };
  }

  const date = formData.get("date") as string | null;
  const startTime = formData.get("startTime") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const mode = formData.get("mode") as "ONLINE" | "PRESENTIAL" | null;
  const notes = formData.get("notes") as string | null;

  if (!date || !startTime || !mode) {
    return { error: "Data, horário de início e modalidade são obrigatórios." };
  }

  try {
    await updateAppointment(session.nutritionistId, appointmentId, {
      date,
      startTime,
      endTime: endTime || null,
      mode,
      notes: notes || null,
    });
    invalidateAfterAppointmentMutation({
      nutritionistId: session.nutritionistId,
      tenant: tenantSlug,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Erro ao atualizar consulta." };
  }
}

export async function updateAppointmentNotesAction(
  tenantSlug: string,
  appointmentId: string,
  notes: string
) {
  const session = await requireAppointmentPermission("edit", tenantSlug);
  if (!session) {
    return { error: "Não autorizado." };
  }

  try {
    const appointment = await updateAppointmentNotes(session.nutritionistId, appointmentId, notes);
    invalidateAfterAppointmentMutation({
      nutritionistId: session.nutritionistId,
      tenant: tenantSlug,
      patientId: appointment.patientId,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao atualizar observações." };
  }
}
