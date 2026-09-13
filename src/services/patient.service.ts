import { prisma } from "@/lib/prisma";

export async function listDistinctPatientTags(nutritionistId: string) {
  return prisma.patientTag.findMany({
    where: { nutritionistId },
    select: { label: true, color: true },
    distinct: ["label"],
    orderBy: { label: "asc" },
  });
}

export async function listPatients(
  nutritionistId: string,
  search?: string,
  status?: string,
  engagement?: string,
  sort?: string,
  tag?: string
) {
  const where: Record<string, unknown> = { nutritionistId };

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && ["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
    where.status = status;
  }

  if (engagement === "WITH_CHECKIN" || engagement === "WITHOUT_CHECKIN") {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setUTCHours(0, 0, 0, 0);
    const condition = engagement === "WITH_CHECKIN"
      ? { some: { date: { gte: since } } }
      : { none: { date: { gte: since } } };
    where.wellnessCheckins = condition;
  }

  if (engagement === "WITH_PLAN") {
    where.mealPlans = { some: { status: "ACTIVE", isTemplate: false } };
  }

  if (tag && tag.trim()) {
    where.patientTags = { some: { label: tag, nutritionistId } };
  }

  const orderBy: Record<string, string> =
    sort === "name" ? { name: "asc" } :
    sort === "oldest" ? { createdAt: "asc" } :
    { createdAt: "desc" };

  return prisma.patient.findMany({
    where,
    include: {
      patientTags: {
        where: { nutritionistId },
        select: { label: true, color: true },
      },
      anamneseResponses: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
      wellnessCheckins: {
        orderBy: { date: "desc" },
        take: 1,
        select: { mood: true, energy: true, date: true },
      },
      appointments: {
        where: { status: "DONE" },
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
    orderBy,
  });
}

export async function getPatientById(
  nutritionistId: string,
  patientId: string
) {
  return prisma.patient.findFirst({
    where: {
      id: patientId,
      nutritionistId,
    },
    include: {
      anamneseResponses: {
        orderBy: { submittedAt: "desc" },
      },
      appointments: {
        orderBy: { date: "desc" },
        take: 5,
      },
      mealPlans: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });
}

export async function createOrUpdatePatient(
  nutritionistId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    weight?: number;
    height?: number;
    goal?: string;
  }
) {
  // Try to find existing patient by phone within the same tenant
  const existing = await prisma.patient.findFirst({
    where: {
      nutritionistId,
      phone: data.phone,
    },
  });

  if (existing) {
    return prisma.patient.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        email: data.email || existing.email,
        birthDate: data.birthDate ? new Date(data.birthDate) : existing.birthDate,
        gender: data.gender || existing.gender,
        weight: data.weight || existing.weight,
        height: data.height || existing.height,
        goal: data.goal || existing.goal,
      },
    });
  }

  return prisma.patient.create({
    data: {
      nutritionistId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      gender: data.gender || null,
      weight: data.weight || null,
      height: data.height || null,
      goal: data.goal || null,
    },
  });
}

export async function createPatient(
  nutritionistId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    weight?: number;
    height?: number;
    goal?: string;
    notes?: string;
  }
) {
  // Check for existing phone within tenant
  const existing = await prisma.patient.findFirst({
    where: { nutritionistId, phone: data.phone },
  });
  if (existing) {
    throw new Error("Já existe um paciente com esse telefone.");
  }

  return prisma.patient.create({
    data: {
      nutritionistId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      gender: data.gender || null,
      weight: data.weight ?? null,
      height: data.height ?? null,
      goal: data.goal || null,
      notes: data.notes || null,
    },
  });
}

export async function updatePatient(
  nutritionistId: string,
  patientId: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    goal?: string;
    notes?: string;
    status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  }
) {
  // Guard: ensure patient belongs to this tenant
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
  });
  if (!patient) {
    throw new Error("Paciente não encontrado.");
  }

  return prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.birthDate !== undefined && {
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      }),
      ...(data.gender !== undefined && { gender: data.gender || null }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.height !== undefined && { height: data.height }),
      ...(data.goal !== undefined && { goal: data.goal || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.status && { status: data.status }),
    },
  });
}

export async function archivePatient(
  nutritionistId: string,
  patientId: string
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
  });
  if (!patient) {
    throw new Error("Paciente não encontrado.");
  }
  return prisma.patient.update({
    where: { id: patientId },
    data: { status: "ARCHIVED" },
  });
}

export async function getPatientWellnessCheckins(nutritionistId: string, patientId: string, limit = 7) {
  return prisma.wellnessCheckin.findMany({
    where: { nutritionistId, patientId },
    orderBy: { date: "desc" },
    take: limit,
    select: { id: true, date: true, mood: true, energy: true, sleep: true, notes: true },
  });
}

export async function getWellnessPanelData(nutritionistId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setUTCHours(0, 0, 0, 0);

  const [patients, checkins] = await Promise.all([
    prisma.patient.findMany({
      where: { nutritionistId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.wellnessCheckin.findMany({
      where: { nutritionistId, date: { gte: since } },
      orderBy: { date: "desc" },
      select: { patientId: true, date: true, mood: true, energy: true, sleep: true, notes: true },
    }),
  ]);

  const checkinsByPatient = new Map<string, typeof checkins>();
  for (const c of checkins) {
    if (!checkinsByPatient.has(c.patientId)) checkinsByPatient.set(c.patientId, []);
    checkinsByPatient.get(c.patientId)!.push(c);
  }

  return patients.map((p) => {
    const pCheckins = checkinsByPatient.get(p.id) ?? [];
    const latest = pCheckins[0] ?? null;
    const avgMood = pCheckins.length > 0
      ? pCheckins.reduce((s, c) => s + c.mood, 0) / pCheckins.length
      : null;
    return { patient: p, latest, checkinCount: pCheckins.length, avgMood };
  });
}


