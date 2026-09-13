"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { anamneseSchema } from "@/validation/anamnese.schema";
import {
  createAnamneseForPatient,
  deleteAnamnese,
  updateAnamnese,
} from "@/services/anamnese.service";
import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";
import { headers } from "next/headers";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function readAnamneseFormData(formData: FormData) {
  return {
    name: formData.get("name")?.toString() || "",
    phone: formData.get("phone")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    birthDate: formData.get("birthDate")?.toString() || "",
    weight: formData.get("weight")?.toString() || "",
    height: formData.get("height")?.toString() || "",
    goal: formData.get("goal")?.toString() || "",
    diseases: formData.get("diseases")?.toString() || "",
    surgeries: formData.get("surgeries")?.toString() || "",
    medications: formData.get("medications")?.toString() || "",
    familyHistory: formData.get("familyHistory")?.toString() || "",
    dietaryRoutine: formData.get("dietaryRoutine")?.toString() || "",
    mealTimes: formData.get("mealTimes")?.toString() || "",
    sleepHabits: formData.get("sleepHabits")?.toString() || "",
    gutHealth: formData.get("gutHealth")?.toString() || "",
    symptoms: formData.get("symptoms")?.toString() || "",
    allergies: formData.get("allergies")?.toString() || "",
    intolerances: formData.get("intolerances")?.toString() || "",
    dietaryRestrictions: formData.get("dietaryRestrictions")?.toString() || "",
    lgpdConsent: "true", // Auto-consented since it's internal
  };
}

export async function submitInternalAnamneseAction(
  tenant: string,
  patientId: string,
  patientRouteParam: string,
  _prevState: { error?: string } | null,
  formData: FormData
) {
  let ctx;
  try {
    ctx = await requirePermission("anamnesis", "create", tenant, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    return { error: "Não autorizado." };
  }

  const session = ctx.session;
  const raw = readAnamneseFormData(formData);

  const parsed = anamneseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const anamnese = await createAnamneseForPatient(session.nutritionistId, patientId, parsed.data);

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
      action: "anamnesis.create",
      resource: "anamnesis",
      resourceId: anamnese.id,
      patientId: patientId,
      result: "SUCCESS",
      changedFields: ["payload"],
      requestContext: { ip, userAgent },
    });
  } catch (err: unknown) {
    return { error: getErrorMessage(err, "Erro ao salvar anamnese. Tente novamente.") };
  }

  revalidatePath(`/dashboard/${tenant}/pacientes/${patientRouteParam}`);
  revalidatePath(`/dashboard/${tenant}/pacientes/${patientRouteParam}/anamnese`);
  redirect(`/dashboard/${tenant}/pacientes/${patientRouteParam}/anamnese`);
}

export async function updateInternalAnamneseAction(
  tenant: string,
  responseId: string,
  patientRouteParam: string,
  _prevState: { error?: string } | null,
  formData: FormData
) {
  let ctx;
  try {
    ctx = await requirePermission("anamnesis", "edit", tenant, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    return { error: "Não autorizado." };
  }

  const session = ctx.session;
  const raw = readAnamneseFormData(formData);

  const parsed = anamneseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await updateAnamnese(session.nutritionistId, responseId, parsed.data);

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
      action: "anamnesis.update",
      resource: "anamnesis",
      resourceId: responseId,
      result: "SUCCESS",
      changedFields: ["payload"],
      requestContext: { ip, userAgent },
    });
  } catch (err: unknown) {
    return { error: getErrorMessage(err, "Erro ao atualizar anamnese. Tente novamente.") };
  }

  revalidatePath(`/dashboard/${tenant}/anamnese/${responseId}`);
  revalidatePath(`/dashboard/${tenant}/pacientes/${patientRouteParam}`);
  revalidatePath(`/dashboard/${tenant}/pacientes/${patientRouteParam}/anamnese`);
  redirect(`/dashboard/${tenant}/anamnese/${responseId}`);
}

export async function deleteInternalAnamneseAction(tenant: string, responseId: string) {
  let ctx;
  try {
    ctx = await requirePermission("anamnesis", "delete", tenant, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Não autorizado." };
  }

  const session = ctx.session;

  try {
    const deleted = await deleteAnamnese(session.nutritionistId, responseId);

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
      action: "anamnesis.delete",
      resource: "anamnesis",
      resourceId: responseId,
      patientId: deleted.patientId,
      result: "SUCCESS",
      requestContext: { ip, userAgent },
    });

    revalidatePath(`/dashboard/${tenant}/anamnese/${responseId}`);
    revalidatePath(`/dashboard/${tenant}/pacientes/${deleted.patientId}`);
    revalidatePath(`/dashboard/${tenant}/pacientes/${deleted.patientId}/anamnese`);
    return { success: true, patientId: deleted.patientId };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Erro ao excluir anamnese. Tente novamente.") };
  }
}
