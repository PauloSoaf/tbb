import { prisma } from "@/lib/prisma";
import type { PatientTaskStatus, PatientTaskPriority } from "@prisma/client";

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getPatientNotes(nutritionistId: string, patientId: string) {
  return prisma.patientNote.findMany({
    where: { nutritionistId, patientId },
    include: { tags: { include: { tag: true } } },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });
}

export async function createPatientNote(
  nutritionistId: string,
  patientId: string,
  data: { title?: string; body: string; tagIds?: string[] }
) {
  return prisma.patientNote.create({
    data: {
      nutritionistId,
      patientId,
      title: data.title,
      body: data.body,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });
}

export async function updatePatientNote(
  nutritionistId: string,
  noteId: string,
  data: { title?: string; body?: string; isPinned?: boolean; tagIds?: string[] }
) {
  const note = await prisma.patientNote.findFirst({ where: { id: noteId, nutritionistId } });
  if (!note) throw new Error("Note not found");

  if (data.tagIds !== undefined) {
    await prisma.patientNoteTag.deleteMany({ where: { noteId } });
    if (data.tagIds.length > 0) {
      await prisma.patientNoteTag.createMany({
        data: data.tagIds.map((tagId) => ({ noteId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.patientNote.update({
    where: { id: noteId },
    data: { title: data.title, body: data.body, isPinned: data.isPinned },
    include: { tags: { include: { tag: true } } },
  });
}

export async function deletePatientNote(nutritionistId: string, noteId: string) {
  const note = await prisma.patientNote.findFirst({ where: { id: noteId, nutritionistId } });
  if (!note) throw new Error("Note not found");
  return prisma.patientNote.delete({ where: { id: noteId } });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getPatientTags(nutritionistId: string, patientId: string) {
  return prisma.patientTag.findMany({
    where: { nutritionistId, patientId },
    orderBy: { label: "asc" },
  });
}

export async function upsertPatientTag(
  nutritionistId: string,
  patientId: string,
  label: string,
  color?: string
) {
  return prisma.patientTag.upsert({
    where: { nutritionistId_patientId_label: { nutritionistId, patientId, label } },
    update: { color: color ?? "#6366f1" },
    create: { nutritionistId, patientId, label, color: color ?? "#6366f1" },
  });
}

export async function deletePatientTag(nutritionistId: string, tagId: string) {
  const tag = await prisma.patientTag.findFirst({ where: { id: tagId, nutritionistId } });
  if (!tag) throw new Error("Tag not found");
  return prisma.patientTag.delete({ where: { id: tagId } });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getPatientTasks(nutritionistId: string, patientId: string) {
  return prisma.patientTask.findMany({
    where: { nutritionistId, patientId },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
  });
}

export async function createPatientTask(
  nutritionistId: string,
  patientId: string,
  data: {
    title: string;
    description?: string;
    priority?: PatientTaskPriority;
    dueDate?: Date;
  }
) {
  return prisma.patientTask.create({
    data: {
      nutritionistId,
      patientId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      dueDate: data.dueDate,
    },
  });
}

export async function updatePatientTask(
  nutritionistId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: PatientTaskStatus;
    priority?: PatientTaskPriority;
    dueDate?: Date | null;
  }
) {
  const task = await prisma.patientTask.findFirst({ where: { id: taskId, nutritionistId } });
  if (!task) throw new Error("Task not found");

  const completedAt =
    data.status === "DONE" && task.status !== "DONE"
      ? new Date()
      : data.status && data.status !== "DONE"
      ? null
      : undefined;

  return prisma.patientTask.update({
    where: { id: taskId },
    data: { ...data, completedAt },
  });
}

export async function deletePatientTask(nutritionistId: string, taskId: string) {
  const task = await prisma.patientTask.findFirst({ where: { id: taskId, nutritionistId } });
  if (!task) throw new Error("Task not found");
  return prisma.patientTask.delete({ where: { id: taskId } });
}

// ─── Timeline (aggregated view) ───────────────────────────────────────────────

export async function getPatientTimeline(nutritionistId: string, patientId: string) {
  const [notes, measurements, appointments, careSessions, documents] = await Promise.all([
    prisma.patientNote.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, title: true, body: true, createdAt: true, isPinned: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.patientMeasurement.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, weight: true, height: true, measuredAt: true },
      orderBy: { measuredAt: "desc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, date: true, status: true, notes: true },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.careSession.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, title: true, status: true, startedAt: true, clinicalSummary: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.document.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, fileName: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  type TimelineEvent =
    | { type: "note"; date: Date; data: typeof notes[number] }
    | { type: "measurement"; date: Date; data: typeof measurements[number] }
    | { type: "appointment"; date: Date; data: typeof appointments[number] }
    | { type: "care_session"; date: Date; data: typeof careSessions[number] }
    | { type: "document"; date: Date; data: typeof documents[number] };

  const events: TimelineEvent[] = [
    ...notes.map((n) => ({ type: "note" as const, date: n.createdAt, data: n })),
    ...measurements.map((m) => ({ type: "measurement" as const, date: m.measuredAt, data: m })),
    ...appointments.map((a) => ({ type: "appointment" as const, date: a.date, data: a })),
    ...careSessions.map((s) => ({
      type: "care_session" as const,
      date: s.startedAt ?? new Date(0),
      data: s,
    })),
    ...documents.map((d) => ({ type: "document" as const, date: d.createdAt, data: d })),
  ];

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
