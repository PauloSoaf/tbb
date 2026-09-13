import { prisma } from "@/lib/prisma";
import { addDays, endOfDay, endOfWeek, startOfDay, startOfWeek, subDays } from "date-fns";

export async function getDashboardStats(nutritionistId: string) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [
    totalPatients,
    totalAnamneses,
    newAnamneses,
    reviewedAnamneses,
    weeklyAppointments,
    patientsWithAttention,
    unreadChatMessages,
    patientsWithoutActivePlan,
  ] = await Promise.all([
    prisma.patient.count({
      where: { nutritionistId, status: "ACTIVE" },
    }),
    prisma.anamneseResponse.count({
      where: { nutritionistId },
    }),
    prisma.anamneseResponse.count({
      where: { nutritionistId, status: "NEW" },
    }),
    prisma.anamneseResponse.count({
      where: { nutritionistId, status: "REVIEWED" },
    }),
    prisma.appointment.count({
      where: {
        nutritionistId,
        date: { gte: weekStart, lte: weekEnd },
        status: { not: "CANCELED" },
      },
    }),
    prisma.anamneseResponse.count({
      where: {
        nutritionistId,
        attentionPoints: { isEmpty: false },
      },
    }),
    prisma.chatMessage.count({
      where: { nutritionistId, sender: "PATIENT", readAt: null },
    }),
    prisma.patient.count({
      where: {
        nutritionistId,
        status: "ACTIVE",
        mealPlans: { none: { status: "ACTIVE", isTemplate: false } },
      },
    }),
  ]);

  return {
    totalPatients,
    totalAnamneses,
    newAnamneses,
    reviewedAnamneses,
    weeklyAppointments,
    patientsWithAttention,
    unreadChatMessages,
    patientsWithoutActivePlan,
  };
}

export async function getRecentAnamneses(
  nutritionistId: string,
  limit: number = 5
) {
  return prisma.anamneseResponse.findMany({
    where: { nutritionistId },
    include: { patient: true },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}

export async function getRecentAttentionPoints(
  nutritionistId: string,
  limit: number = 5
) {
  const recentAnamneses = await prisma.anamneseResponse.findMany({
    where: {
      nutritionistId,
      attentionPoints: { isEmpty: false },
    },
    include: { patient: true },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });

  return recentAnamneses.map((a) => ({
    patientName: a.patient.name,
    patientId: a.patient.id,
    responseId: a.id,
    attentionPoints: a.attentionPoints,
    submittedAt: a.submittedAt,
  }));
}

export async function getLowMoodAlerts(nutritionistId: string) {
  const since = subDays(new Date(), 2);
  since.setUTCHours(0, 0, 0, 0);

  const checkins = await prisma.wellnessCheckin.findMany({
    where: { nutritionistId, date: { gte: since }, mood: { lte: 2 } },
    include: { patient: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  const seen = new Set<string>();
  const alerts: { patientId: string; patientName: string; mood: number; date: Date }[] = [];
  for (const c of checkins) {
    if (!seen.has(c.patientId)) {
      seen.add(c.patientId);
      alerts.push({ patientId: c.patientId, patientName: c.patient.name, mood: c.mood, date: c.date });
    }
  }
  return alerts;
}

export async function getBirthdaysThisWeek(nutritionistId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const patients = await prisma.patient.findMany({
    where: { nutritionistId, status: "ACTIVE", birthDate: { not: null } },
    select: { id: true, name: true, birthDate: true },
  });

  const thisWeek: { id: string; name: string; birthDate: Date; daysUntil: number }[] = [];
  for (const p of patients) {
    if (!p.birthDate) continue;
    const bd = new Date(p.birthDate);
    const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    if (thisYear >= weekStart && thisYear <= weekEnd) {
      const rawDiff = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000);
      const diff = Object.is(rawDiff, -0) ? 0 : rawDiff;
      thisWeek.push({ id: p.id, name: p.name, birthDate: p.birthDate, daysUntil: diff });
    }
  }

  return thisWeek.sort((a, b) => a.daysUntil - b.daysUntil);
}

export async function getPatientsWithoutRecentCheckin(nutritionistId: string) {
  const since = subDays(new Date(), 7);
  since.setUTCHours(0, 0, 0, 0);

  const activePatients = await prisma.patient.count({ where: { nutritionistId, status: "ACTIVE" } });
  const withCheckin = await prisma.wellnessCheckin.groupBy({
    by: ["patientId"],
    where: { nutritionistId, date: { gte: since } },
  });

  return activePatients - withCheckin.length;
}

export async function getTodayCheckins(nutritionistId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.wellnessCheckin.findMany({
    where: { nutritionistId, date: { gte: today, lt: tomorrow } },
    select: {
      mood: true,
      energy: true,
      patient: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    take: 10,
  });
}

export async function getWeeklyAppointments(nutritionistId: string) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return prisma.appointment.findMany({
    where: {
      nutritionistId,
      date: { gte: weekStart, lte: weekEnd },
    },
    include: { patient: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 5,
  });
}

export async function getTodayAppointments(nutritionistId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  return prisma.appointment.findMany({
    where: {
      nutritionistId,
      date: { gte: todayStart, lte: todayEnd },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      mode: true,
      status: true,
      patient: { select: { id: true, name: true } },
      careSessions: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ startTime: "asc" }, { date: "asc" }],
    take: 8,
  });
}

export async function getUpcomingAppointments(nutritionistId: string, limit = 5) {
  const tomorrow = startOfDay(addDays(new Date(), 1));

  return prisma.appointment.findMany({
    where: {
      nutritionistId,
      date: { gte: tomorrow },
      status: { not: "CANCELED" },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      mode: true,
      status: true,
      patient: { select: { id: true, name: true } },
      careSessions: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: limit,
  });
}

export async function getUnreadMessagesSummary(nutritionistId: string, limit = 5) {
  const messages = await prisma.chatMessage.findMany({
    where: { nutritionistId, sender: "PATIENT", readAt: null },
    select: {
      id: true,
      body: true,
      createdAt: true,
      patient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const seen = new Set<string>();
  return messages.filter((message) => {
    if (seen.has(message.patient.id)) return false;
    seen.add(message.patient.id);
    return true;
  });
}

export async function getPatientsNeedingAction(nutritionistId: string, limit = 8) {
  const since = startOfDay(subDays(new Date(), 7));
  const today = startOfDay(new Date());

  const [newAnamneses, withoutPlan, withoutMeasurement, withoutFutureAppointment, withoutCheckin] = await Promise.all([
    prisma.anamneseResponse.findMany({
      where: { nutritionistId, status: "NEW" },
      select: { patient: { select: { id: true, name: true } }, submittedAt: true },
      orderBy: { submittedAt: "desc" },
      take: limit,
    }),
    prisma.patient.findMany({
      where: {
        nutritionistId,
        status: "ACTIVE",
        mealPlans: { none: { status: "ACTIVE", isTemplate: false } },
      },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.patient.findMany({
      where: {
        nutritionistId,
        status: "ACTIVE",
        patientMeasurements: { none: {} },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.patient.findMany({
      where: {
        nutritionistId,
        status: "ACTIVE",
        appointments: { none: { date: { gte: today }, status: { not: "CANCELED" } } },
      },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.patient.findMany({
      where: {
        nutritionistId,
        status: "ACTIVE",
        wellnessCheckins: { none: { date: { gte: since } } },
      },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  const actions = new Map<string, { patientId: string; patientName: string; reason: string; recommendation: string; href: string; tone: "blue" | "amber" | "rose" }>();

  for (const item of newAnamneses) {
    actions.set(`anamnese-${item.patient.id}`, {
      patientId: item.patient.id,
      patientName: item.patient.name,
      reason: "Anamnese nova para revisar",
      recommendation: "Revisar anamnese",
      href: `/pacientes/${item.patient.id}/anamnese`,
      tone: "blue",
    });
  }

  for (const patient of withoutPlan) {
    actions.set(`plan-${patient.id}`, {
      patientId: patient.id,
      patientName: patient.name,
      reason: "Sem plano alimentar ativo",
      recommendation: "Criar plano",
      href: `/pacientes/${patient.id}/planos/novo`,
      tone: "amber",
    });
  }

  for (const patient of withoutMeasurement) {
    actions.set(`measurement-${patient.id}`, {
      patientId: patient.id,
      patientName: patient.name,
      reason: "Sem avaliacao antropometrica",
      recommendation: "Registrar medidas",
      href: `/pacientes/${patient.id}/medidas/nova`,
      tone: "blue",
    });
  }

  for (const patient of withoutFutureAppointment) {
    actions.set(`appointment-${patient.id}`, {
      patientId: patient.id,
      patientName: patient.name,
      reason: "Sem consulta futura",
      recommendation: "Agendar retorno",
      href: `/agenda`,
      tone: "amber",
    });
  }

  for (const patient of withoutCheckin) {
    actions.set(`checkin-${patient.id}`, {
      patientId: patient.id,
      patientName: patient.name,
      reason: "Sem check-in ha 7 dias",
      recommendation: "Abrir paciente",
      href: `/pacientes/${patient.id}`,
      tone: "rose",
    });
  }

  return Array.from(actions.values()).slice(0, limit);
}

