"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { manualWeightSchema } from "@/validation/manual-measurement.schema";
import {
  patientMeasurementSchema,
  type PatientMeasurementFormData,
} from "@/validation/patient-measurement.schema";
import {
  createPatientMeasurement,
  updatePatientMeasurement,
} from "@/services/patient-measurement.service";
import { calculateBMI } from "@/lib/utils/calculateBMI";
import { classifyBMI } from "@/lib/utils/classifyBMI";
import { calculateAssessmentSummary } from "@/lib/anthropometry";
import { AuthorizationError, requirePermission } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";

type ActionState = { error?: string; success?: boolean; message?: string } | null;

function measuredAtFromForm(value: string | undefined) {
  return value ? new Date(`${value}T12:00:00`) : new Date();
}

const measurementTextFields = new Set([
  "measuredAt",
  "source",
  "notes",
  "assessmentProfile",
  "biologicalSex",
  "skinfoldProtocol",
  "skinfoldMeasurements",
  "skinfoldFormula",
  "waistHipRisk",
  "waistHeightRisk",
]);

function parseMeasurementForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());

  for (const key in raw) {
    if (raw[key] === "") {
      raw[key] = null as unknown as FormDataEntryValue;
      continue;
    }

    if (
      typeof raw[key] === "string" &&
      !measurementTextFields.has(key) &&
      Number.isFinite(Number(raw[key]))
    ) {
      raw[key] = Number(raw[key]) as unknown as FormDataEntryValue;
    }
  }

  return patientMeasurementSchema.safeParse(raw);
}

/**
 * Derive every clinical result on the server. Fields such as BMI, ratios and
 * body-fat estimates are intentionally never accepted from the browser.
 */
function buildClinicalMeasurementData(data: PatientMeasurementFormData) {
  const summary = calculateAssessmentSummary({
    profile: data.assessmentProfile,
    sex: data.biologicalSex,
    age: data.assessmentAge,
    weight: data.weight,
    height: data.height,
    waist: data.waist,
    hip: data.hip,
    bodyFatPercentage: data.bodyFatPercentage,
    protocol: data.skinfoldProtocol,
    skinfoldMeasurements: data.skinfoldMeasurements,
  });

  const skinfoldMeasurements = summary.skinfoldMeasurements
    ? (JSON.parse(JSON.stringify(summary.skinfoldMeasurements)) as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  return {
    source: data.source,
    weight: data.weight,
    height: data.height,
    waist: data.waist,
    hip: data.hip,
    neck: data.neck,
    chest: data.chest,
    abdomen: data.abdomen,
    relaxedArm: data.relaxedArm,
    contractedArm: data.contractedArm,
    forearm: data.forearm,
    thigh: data.thigh,
    calf: data.calf,
    notes: data.notes?.trim() || null,
    assessmentProfile: summary.assessmentProfile,
    assessmentAge: summary.assessmentAge,
    biologicalSex: summary.biologicalSex,
    bmi: summary.bmi,
    bmiClassification: summary.bmiClassification,
    waistHipRatio: summary.waistHipRatio,
    waistHeightRatio: summary.waistHeightRatio,
    waistHipRisk: summary.waistHipRisk,
    waistHeightRisk: summary.waistHeightRisk,
    bodyFatPercentage: summary.bodyFatPercentage,
    bodyFatKg: summary.bodyFatKg,
    leanMassKg: summary.leanMassKg,
    skinfoldProtocol: summary.skinfoldProtocol,
    skinfoldMeasurements,
    skinfoldSum: summary.skinfoldSum,
    skinfoldBodyDensity: summary.skinfoldBodyDensity,
    skinfoldFormula: summary.skinfoldFormula,
  };
}

async function getAssessmentContext(tenantSlug: string) {
  try {
    return await requirePermission("patients", "edit", tenantSlug, { throwOnFailure: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return null;
    throw error;
  }
}

async function recordAssessmentAudit(input: {
  action: "assessment.create" | "assessment.update";
  tenantId: string;
  actor: { userId: string; teamMemberId?: string | null; name: string; role: string };
  assessmentId: string;
  patientId: string;
  protocol: string | null;
}) {
  await auditLogService.record({
    tenantId: input.tenantId,
    actor: input.actor,
    action: input.action,
    resource: "patientMeasurement",
    resourceId: input.assessmentId,
    patientId: input.patientId,
    changedFields: ["assessmentProfile", "anthropometry", "bodyComposition"],
    metadata: {
      protocol: input.protocol ?? "NONE",
      result: "CALCULATED_SERVER_SIDE",
    },
  });
}

function revalidateAssessmentPaths(tenantSlug: string, patientRouteParam: string) {
  revalidatePath(`/dashboard/${tenantSlug}/pacientes/${patientRouteParam}`);
  revalidatePath(`/dashboard/${tenantSlug}/pacientes/${patientRouteParam}/avaliacoes`);
  revalidatePath(`/dashboard/${tenantSlug}/pacientes/${patientRouteParam}/medidas`);
  revalidatePath(`/portal/${tenantSlug}/pacientes/${patientRouteParam}`);
}

export async function createManualWeightAction(
  tenantSlug: string,
  patientId: string,
  patientRouteParam: string,
  _prevState: ActionState,
  formData: FormData
) {
  const ctx = await getAssessmentContext(tenantSlug);
  if (!ctx) return { error: "Nao autorizado." };

  const parsed = manualWeightSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [patient, latestMeasurement] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: ctx.nutritionistId },
      select: { height: true },
    }),
    prisma.patientMeasurement.findFirst({
      where: { patientId, nutritionistId: ctx.nutritionistId, height: { not: null } },
      orderBy: { measuredAt: "desc" },
      select: { height: true },
    }),
  ]);

  if (!patient) return { error: "Paciente nao encontrado." };

  const height = patient.height ?? latestMeasurement?.height ?? null;
  const bmi = calculateBMI(parsed.data.weight, height);
  const bmiClassification = bmi ? classifyBMI(bmi).label : null;

  try {
    const measurement = await createPatientMeasurement(ctx.nutritionistId, patientId, {
      source: "MANUAL",
      weight: parsed.data.weight,
      height,
      bmi,
      bmiClassification,
      notes: parsed.data.notes?.trim() || null,
      measuredAt: measuredAtFromForm(parsed.data.measuredAt),
    });

    await recordAssessmentAudit({
      action: "assessment.create",
      tenantId: ctx.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.nutritionist.name,
        role: ctx.role,
      },
      assessmentId: measurement.id,
      patientId,
      protocol: null,
    });

    revalidateAssessmentPaths(tenantSlug, patientRouteParam);
    return { success: true, message: "Peso manual registrado." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao salvar peso manual." };
  }
}

export async function createMeasurementAction(
  tenantSlug: string,
  patientId: string,
  patientRouteParam: string,
  _prevState: ActionState,
  formData: FormData
) {
  const ctx = await getAssessmentContext(tenantSlug);
  if (!ctx) return { error: "Nao autorizado." };

  const parsed = parseMeasurementForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  const clinicalData = buildClinicalMeasurementData(data);

  try {
    const measurement = await createPatientMeasurement(ctx.nutritionistId, patientId, {
      ...clinicalData,
      measuredAt: measuredAtFromForm(data.measuredAt),
    });

    await recordAssessmentAudit({
      action: "assessment.create",
      tenantId: ctx.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.nutritionist.name,
        role: ctx.role,
      },
      assessmentId: measurement.id,
      patientId,
      protocol: clinicalData.skinfoldProtocol,
    });

    revalidateAssessmentPaths(tenantSlug, patientRouteParam);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao salvar avaliacao." };
  }

  redirect(`/dashboard/${tenantSlug}/pacientes/${patientRouteParam}/avaliacoes`);
}

export async function updateMeasurementAction(
  tenantSlug: string,
  patientId: string,
  patientRouteParam: string,
  measurementId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const ctx = await getAssessmentContext(tenantSlug);
  if (!ctx) return { error: "Nao autorizado." };

  const parsed = parseMeasurementForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  const clinicalData = buildClinicalMeasurementData(data);

  try {
    const measurement = await updatePatientMeasurement(ctx.nutritionistId, patientId, measurementId, {
      ...clinicalData,
      measuredAt: measuredAtFromForm(data.measuredAt),
    });

    await recordAssessmentAudit({
      action: "assessment.update",
      tenantId: ctx.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.nutritionist.name,
        role: ctx.role,
      },
      assessmentId: measurement.id,
      patientId,
      protocol: clinicalData.skinfoldProtocol,
    });

    revalidateAssessmentPaths(tenantSlug, patientRouteParam);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao atualizar avaliacao." };
  }

  redirect(`/dashboard/${tenantSlug}/pacientes/${patientRouteParam}/avaliacoes/${measurementId}`);
}
