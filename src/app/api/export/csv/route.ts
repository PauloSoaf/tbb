import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/calculateAge";
import { toCsv } from "@/lib/utils/to-csv";
import { genderLabel } from "@/lib/utils/gender-label";

function csvResponse(rows: Record<string, unknown>[], fileName: string) {
  const csv = toCsv(rows);
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const patientId = searchParams.get("patientId");
  const type = searchParams.get("type") ?? "measurements";

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (type === "patient-comparison") {
    const patientA = searchParams.get("patientA");
    const patientB = searchParams.get("patientB");
    if (!patientA || !patientB) {
      return NextResponse.json({ error: "patientA and patientB required" }, { status: 400 });
    }

    const snapshots = await Promise.all([
      getPatientComparisonSnapshot(session.nutritionistId, patientA),
      getPatientComparisonSnapshot(session.nutritionistId, patientB),
    ]);

    if (!snapshots[0] || !snapshots[1]) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [left, right] = snapshots;
    const rows = [
      { metrica: "Paciente", paciente_1: left.name, paciente_2: right.name },
      { metrica: "Idade", paciente_1: left.age ?? "", paciente_2: right.age ?? "" },
      { metrica: "Sexo", paciente_1: left.gender, paciente_2: right.gender },
      { metrica: "Objetivo", paciente_1: left.goal ?? "", paciente_2: right.goal ?? "" },
      { metrica: "Peso atual kg", paciente_1: left.weight ?? "", paciente_2: right.weight ?? "" },
      { metrica: "IMC", paciente_1: left.bmi ?? "", paciente_2: right.bmi ?? "" },
      { metrica: "Gordura %", paciente_1: left.bodyFatPercentage ?? "", paciente_2: right.bodyFatPercentage ?? "" },
      { metrica: "Consultas realizadas", paciente_1: left.doneAppointments, paciente_2: right.doneAppointments },
      { metrica: "Diario alimentar 30d", paciente_1: left.diaryEntries, paciente_2: right.diaryEntries },
      { metrica: "Check-ins 7d", paciente_1: left.checkins, paciente_2: right.checkins },
      { metrica: "Metas ativas", paciente_1: left.activeGoals, paciente_2: right.activeGoals },
      { metrica: "Metas atingidas", paciente_1: left.achievedGoals, paciente_2: right.achievedGoals },
    ];

    return csvResponse(rows, "comparativo-pacientes");
  }

  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const base = { patientId, nutritionistId: session.nutritionistId };
  let rows: Record<string, unknown>[] = [];
  let fileName = "export";

  if (type === "measurements") {
    const data = await prisma.patientMeasurement.findMany({
      where: base,
      orderBy: { measuredAt: "desc" },
    });
    rows = data.map((m) => ({
      data: format(new Date(m.measuredAt), "dd/MM/yyyy"),
      peso_kg: m.weight ?? "",
      altura_cm: m.height ?? "",
      imc: m.bmi ?? "",
      gordura_pct: m.bodyFatPercentage ?? "",
      cintura_cm: m.waist ?? "",
      quadril_cm: m.hip ?? "",
      antebraco_cm: m.forearm ?? "",
    }));
    fileName = "medidas-antropometricas";
  } else if (type === "skinfoldsassessments") {
    const data = await prisma.skinfoldAssessment.findMany({
      where: base,
      orderBy: { assessedAt: "desc" },
    });
    rows = data.map((s) => ({
      data: format(new Date(s.assessedAt), "dd/MM/yyyy"),
      protocolo: s.protocol,
      gordura_pct: s.bodyFatPct ?? "",
      massa_magra_kg: s.leanMassKg ?? "",
      gordura_kg: s.bodyFatKg ?? "",
    }));
    fileName = "dobras-cutaneas";
  } else if (type === "diary") {
    const data = await prisma.foodDiaryEntry.findMany({
      where: base,
      orderBy: { loggedAt: "desc" },
    });
    rows = data.map((e) => ({
      data: format(new Date(e.loggedAt), "dd/MM/yyyy HH:mm"),
      refeicao: e.meal,
      alimento: e.foodName,
      calorias: e.calories ?? "",
      proteinas_g: e.protein ?? "",
      carboidratos_g: e.carbs ?? "",
      gorduras_g: e.fat ?? "",
      humor: e.mood ?? "",
    }));
    fileName = "diario-alimentar";
  } else if (type === "wellness") {
    const data = await prisma.wellnessCheckin.findMany({
      where: base,
      orderBy: { date: "desc" },
    });
    rows = data.map((c) => ({
      data: format(new Date(c.date), "dd/MM/yyyy"),
      humor_1_5: c.mood,
      energia_1_5: c.energy,
      sono_horas: c.sleep ?? "",
      notas: c.notes ?? "",
    }));
    fileName = "bem-estar";
  } else if (type === "goals") {
    const data = await prisma.patientGoal.findMany({
      where: base,
      include: { checkIns: { orderBy: { checkedAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    rows = data.map((g) => ({
      titulo: g.title,
      tipo: g.type,
      status: g.status,
      valor_inicial: g.initialValue ?? "",
      valor_atual: g.currentValue ?? "",
      valor_alvo: g.targetValue ?? "",
      unidade: g.targetUnit ?? "",
      ultimo_checkin: g.checkIns[0] ? format(new Date(g.checkIns[0].checkedAt), "dd/MM/yyyy") : "",
      total_checkins: g.checkIns.length,
    }));
    fileName = "metas";
  }

  return csvResponse(rows, fileName);
}

async function getPatientComparisonSnapshot(nutritionistId: string, patientId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const [patient, latestMeasurement, doneAppointments, diaryEntries, checkins, activeGoals, achievedGoals] =
    await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, nutritionistId },
        select: { name: true, goal: true, birthDate: true, gender: true },
      }),
      prisma.patientMeasurement.findFirst({
        where: { patientId, nutritionistId },
        orderBy: { measuredAt: "desc" },
        select: { weight: true, bmi: true, bodyFatPercentage: true },
      }),
      prisma.appointment.count({ where: { patientId, nutritionistId, status: "DONE" } }),
      prisma.foodDiaryEntry.count({ where: { patientId, nutritionistId, loggedAt: { gte: thirtyDaysAgo } } }),
      prisma.wellnessCheckin.count({ where: { patientId, nutritionistId, date: { gte: sevenDaysAgo } } }),
      prisma.patientGoal.count({ where: { patientId, nutritionistId, status: "ACTIVE" } }),
      prisma.patientGoal.count({ where: { patientId, nutritionistId, status: "ACHIEVED" } }),
    ]);

  if (!patient) return null;

  return {
    name: patient.name,
    age: patient.birthDate ? calculateAge(patient.birthDate) : null,
    gender: genderLabel(patient.gender),
    goal: patient.goal,
    weight: latestMeasurement?.weight ?? null,
    bmi: latestMeasurement?.bmi ?? null,
    bodyFatPercentage: latestMeasurement?.bodyFatPercentage ?? null,
    doneAppointments,
    diaryEntries,
    checkins,
    activeGoals,
    achievedGoals,
  };
}

