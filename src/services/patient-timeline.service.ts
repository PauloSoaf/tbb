import { prisma } from "@/lib/prisma";

export type TimelineEvent = {
  id: string;
  type: "ANAMNESE" | "MEASUREMENT" | "DOCUMENT" | "MEAL_PLAN" | "NOTE" | "APPOINTMENT" | "CARE_SESSION";
  title: string;
  description?: string;
  date: Date;
  metadata?: Record<string, unknown>;
};

export async function getPatientTimeline(nutritionistId: string, patientId: string): Promise<TimelineEvent[]> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
  });
  if (!patient) throw new Error("Patient not found");

  const [anamneses, measurements, documents, mealPlans, notes, appointments, careSessions] =
    await Promise.all([
      prisma.anamneseResponse.findMany({ where: { patientId, nutritionistId } }),
      prisma.patientMeasurement.findMany({ where: { patientId, nutritionistId } }),
      prisma.document.findMany({ where: { patientId, nutritionistId } }),
      prisma.mealPlan.findMany({ where: { patientId, nutritionistId } }),
      prisma.patientNote.findMany({ where: { patientId, nutritionistId } }),
      prisma.appointment.findMany({ where: { patientId, nutritionistId } }),
      prisma.careSession.findMany({ where: { patientId, nutritionistId } }),
    ]);

  const events: TimelineEvent[] = [];

  anamneses.forEach((a) => events.push({
    id: a.id,
    type: "ANAMNESE",
    title: "Anamnese Preenchida",
    description: a.summary || "Respostas da anamnese pre-consulta.",
    date: a.submittedAt,
    metadata: { status: a.status },
  }));

  measurements.forEach((m) => events.push({
    id: m.id,
    type: "MEASUREMENT",
    title: "Avaliacao Antropometrica",
    description: `Peso: ${m.weight || "--"}kg, Gordura: ${m.bodyFatPercentage || "--"}%`,
    date: m.measuredAt,
    metadata: { source: m.source },
  }));

  documents.forEach((d) => events.push({
    id: d.id,
    type: "DOCUMENT",
    title: "Arquivo Adicionado",
    description: d.fileName,
    date: d.createdAt,
    metadata: { type: d.type, url: d.fileUrl },
  }));

  mealPlans.forEach((mp) => events.push({
    id: mp.id,
    type: "MEAL_PLAN",
    title: "Plano Alimentar Criado",
    description: mp.title || "Novo plano",
    date: mp.createdAt,
    metadata: { status: mp.status, calories: mp.totalCalories },
  }));

  notes.forEach((n) => events.push({
    id: n.id,
    type: "NOTE",
    title: n.title || "Nota Clinica",
    description: n.body,
    date: n.createdAt,
    metadata: { isPinned: n.isPinned },
  }));

  appointments.forEach((a) => {
    const details = [
      `Modo: ${a.mode === "ONLINE" ? "Online" : "Presencial"}`,
      a.startTime ? `Horario: ${a.startTime}` : null,
      a.notes?.trim() ? `Notas: ${a.notes.trim()}` : null,
    ].filter(Boolean);

    events.push({
      id: a.id,
      type: "APPOINTMENT",
      title: "Consulta Agendada",
      description: details.join("\n"),
      date: a.date,
      metadata: { status: a.status, startTime: a.startTime },
    });
  });

  careSessions.forEach((c) => {
    const description = c.clinicalSummary?.trim()
      || c.notes?.trim()
      || c.title
      || "Sessao de cuidado nutricional.";

    events.push({
      id: c.id,
      type: "CARE_SESSION",
      title: "Atendimento Online",
      description,
      date: c.startedAt || c.createdAt,
      metadata: { status: c.status, duration: c.durationSeconds },
    });
  });

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function addPatientNote(nutritionistId: string, patientId: string, body: string, title?: string) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, nutritionistId } });
  if (!patient) throw new Error("Patient not found");

  return prisma.patientNote.create({
    data: { patientId, nutritionistId, body, title },
  });
}
