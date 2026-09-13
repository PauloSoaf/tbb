import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/calculateAge";
import { genderLabel } from "@/lib/utils/gender-label";

export async function getAIPatientContext({
  nutritionistId,
  patientId,
}: {
  nutritionistId: string;
  patientId: string;
}) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
    select: {
      id: true,
      name: true,
      birthDate: true,
      gender: true,
      goal: true,
      status: true,
      createdAt: true,
      anamneseResponses: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { summary: true, attentionPoints: true, submittedAt: true },
      },
      patientMeasurements: {
        orderBy: { measuredAt: "desc" },
        take: 1,
        select: { weight: true, height: true, bmi: true, bodyFatPercentage: true, measuredAt: true },
      },
      mealPlans: {
        where: { status: "ACTIVE", isTemplate: false },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { title: true, totalCalories: true, updatedAt: true },
      },
      appointments: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 1,
        select: { date: true, startTime: true, mode: true, status: true },
      },
      patientTasks: {
        where: { status: "PENDING" },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: { title: true, priority: true, dueDate: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { fileName: true, type: true, createdAt: true },
      },
      patientGoals: {
        where: { status: "ACTIVE" },
        take: 5,
        select: { title: true, currentValue: true, targetValue: true, targetUnit: true },
      },
    },
  });

  if (!patient) return null;

  const latestAnamnesis = patient.anamneseResponses[0];
  const latestMeasurement = patient.patientMeasurements[0];
  const activePlan = patient.mealPlans[0];
  const nextAppointment = patient.appointments[0];

  return {
    id: patient.id,
    nome: patient.name,
    idade: patient.birthDate ? calculateAge(patient.birthDate) : null,
    sexo: genderLabel(patient.gender),
    objetivo: patient.goal,
    status: patient.status,
    acompanhamentoDesde: format(patient.createdAt, "dd/MM/yyyy"),
    ultimaAnamnese: latestAnamnesis
      ? {
          enviadaEm: format(latestAnamnesis.submittedAt, "dd/MM/yyyy"),
          resumo: latestAnamnesis.summary?.slice(0, 600) ?? null,
          pontosAtencao: latestAnamnesis.attentionPoints.slice(0, 6),
        }
      : null,
    ultimaAntropometria: latestMeasurement
      ? {
          data: format(latestMeasurement.measuredAt, "dd/MM/yyyy"),
          pesoKg: latestMeasurement.weight,
          alturaCm: latestMeasurement.height,
          imc: latestMeasurement.bmi,
          gorduraPct: latestMeasurement.bodyFatPercentage,
        }
      : null,
    planoAtivo: activePlan
      ? {
          titulo: activePlan.title,
          calorias: activePlan.totalCalories,
          atualizadoEm: format(activePlan.updatedAt, "dd/MM/yyyy"),
        }
      : null,
    proximaConsulta: nextAppointment
      ? {
          data: format(nextAppointment.date, "dd/MM/yyyy"),
          horario: nextAppointment.startTime,
          modo: nextAppointment.mode,
          status: nextAppointment.status,
        }
      : null,
    pendencias: patient.patientTasks.map((task) => ({
      titulo: task.title,
      prioridade: task.priority,
      vencimento: task.dueDate ? format(task.dueDate, "dd/MM/yyyy") : null,
    })),
    metasAtivas: patient.patientGoals.map((goal) => ({
      titulo: goal.title,
      atual: goal.currentValue,
      alvo: goal.targetValue,
      unidade: goal.targetUnit,
    })),
    arquivosRecentes: patient.documents.map((document) => ({
      nome: document.fileName,
      tipo: document.type,
      enviadoEm: format(document.createdAt, "dd/MM/yyyy"),
    })),
    aviso: "Contexto resumido para apoio operacional. Nao substitui avaliacao profissional.",
  };
}

