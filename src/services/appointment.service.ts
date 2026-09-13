import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function listAppointments(
  nutritionistId: string,
  filters?: { weekOf?: Date; monthOf?: Date; patientId?: string }
) {
  const where: Record<string, unknown> = { nutritionistId };

  if (filters?.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters?.monthOf) {
    const start = startOfMonth(filters.monthOf);
    const end = endOfMonth(filters.monthOf);
    where.date = { gte: start, lte: end };
  } else if (filters?.weekOf) {
    const start = startOfWeek(filters.weekOf, { weekStartsOn: 1 });
    const end = endOfWeek(filters.weekOf, { weekStartsOn: 1 });
    where.date = { gte: start, lte: end };
  }

  return prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      careSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getAppointmentById(
  nutritionistId: string,
  appointmentId: string
) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, nutritionistId },
    include: { patient: true },
  });
}

export async function createAppointment(
  nutritionistId: string,
  data: {
    patientId: string;
    date: string;
    startTime: string;
    endTime?: string;
    mode: "ONLINE" | "PRESENTIAL";
    status: "SCHEDULED" | "DONE" | "CANCELED";
    notes?: string;
  }
) {
  // Guard: ensure patient belongs to this tenant
  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, nutritionistId },
  });
  if (!patient) {
    throw new Error("Paciente não encontrado neste consultório.");
  }

  return prisma.appointment.create({
    data: {
      nutritionistId,
      patientId: data.patientId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime || null,
      mode: data.mode,
      status: data.status,
      notes: data.notes || null,
    },
    include: { patient: { select: { id: true, name: true } } },
  });
}

export async function updateAppointmentStatus(
  nutritionistId: string,
  appointmentId: string,
  status: "SCHEDULED" | "DONE" | "CANCELED"
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, nutritionistId },
  });
  if (!appointment) {
    throw new Error("Consulta não encontrada.");
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });
}

export async function updateAppointment(
  nutritionistId: string,
  appointmentId: string,
  data: {
    date?: string;
    startTime?: string;
    endTime?: string | null;
    mode?: "ONLINE" | "PRESENTIAL";
    notes?: string | null;
  }
) {
  const existing = await prisma.appointment.findFirst({
    where: { id: appointmentId, nutritionistId },
  });
  if (!existing) throw new Error("Consulta não encontrada.");
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.mode !== undefined && { mode: data.mode }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function updateAppointmentNotes(
  nutritionistId: string,
  appointmentId: string,
  notes: string
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, nutritionistId },
  });
  if (!appointment) {
    throw new Error("Consulta não encontrada.");
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { notes },
  });
}

export async function countWeeklyAppointments(
  nutritionistId: string,
  weekOf: Date = new Date()
): Promise<number> {
  const start = startOfWeek(weekOf, { weekStartsOn: 1 });
  const end = endOfWeek(weekOf, { weekStartsOn: 1 });
  return prisma.appointment.count({
    where: {
      nutritionistId,
      date: { gte: start, lte: end },
      status: { not: "CANCELED" },
    },
  });
}
