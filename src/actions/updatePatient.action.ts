"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { patientSchema } from "@/validation/patient.schema";
import { updatePatient, archivePatient, getPatientById } from "@/services/patient.service";
import { getPatientHref } from "@/services/patient-route.service";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";
import { headers } from "next/headers";

export async function updatePatientAction(
  tenantSlug: string,
  patientId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  let ctx;
  try {
    ctx = await requirePermission("patients", "edit", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    return { error: "Não autorizado." };
  }

  const session = ctx.session;
  const raw = Object.fromEntries(formData.entries());
  const parsed = patientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  let redirectHref = `/dashboard/${tenantSlug}/pacientes/${patientId}`;

  try {
    const previousPatient = await getPatientById(session.nutritionistId, patientId);
    const patient = await updatePatient(session.nutritionistId, patientId, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate,
      gender: data.gender || null,
      weight: typeof data.weight === "number" ? data.weight : null,
      height: typeof data.height === "number" ? data.height : null,
      goal: data.goal,
      notes: data.notes,
      status: data.status,
    });

    // Determine changed fields
    const changedFields: string[] = [];
    if (previousPatient) {
      if (previousPatient.name !== data.name) changedFields.push("name");
      if (previousPatient.phone !== data.phone) changedFields.push("phone");
      if (previousPatient.email !== data.email) changedFields.push("email");
      if (previousPatient.status !== data.status) changedFields.push("status");
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "patient.update",
      resource: "patient",
      resourceId: patient.id,
      resourceLabelSnapshot: patient.name,
      patientId: patient.id,
      patientNameSnapshot: patient.name,
      result: "SUCCESS",
      changedFields,
      requestContext: { ip, userAgent },
    });

    const previousPatientHref = previousPatient
      ? getPatientHref({ tenant: tenantSlug, patient: previousPatient })
      : redirectHref;
    redirectHref = getPatientHref({ tenant: tenantSlug, patient });
    revalidatePath(`/dashboard/${tenantSlug}`);
    revalidatePath(`/dashboard/${tenantSlug}/pacientes`);
    revalidatePath(`/dashboard/${tenantSlug}/pacientes/${patientId}`);
    revalidatePath(previousPatientHref);
    revalidatePath(`${previousPatientHref}/editar`);
    revalidatePath(redirectHref);
    revalidatePath(`${redirectHref}/editar`);
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao atualizar paciente. Tente novamente." };
  }

  redirect(redirectHref);
}

export async function archivePatientAction(
  tenantSlug: string,
  patientId: string
) {
  let ctx;
  try {
    ctx = await requirePermission("patients", "archive", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    return { error: "Não autorizado." };
  }

  const session = ctx.session;

  try {
    const patient = await getPatientById(session.nutritionistId, patientId);
    await archivePatient(session.nutritionistId, patientId);

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "patient.archive",
      resource: "patient",
      resourceId: patientId,
      resourceLabelSnapshot: patient?.name || "Paciente Arquivado",
      patientId: patientId,
      patientNameSnapshot: patient?.name || "Paciente Arquivado",
      result: "SUCCESS",
      changedFields: ["status"],
      requestContext: { ip, userAgent },
    });

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao arquivar paciente." };
  }
}
