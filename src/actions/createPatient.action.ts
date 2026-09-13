"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { patientSchema } from "@/validation/patient.schema";
import { createPatient } from "@/services/patient.service";
import { sendWelcomePatientEmail } from "@/services/email.service";
import { generateActivationLink } from "@/services/patient-portal.service";
import { prisma } from "@/lib/prisma";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";
import { usageLimitService } from "@/services/usageLimit.service";
import { headers } from "next/headers";

export async function createPatientAction(
  tenantSlug: string,
  _prevState: { error?: string } | null,
  formData: FormData
) {
  let ctx;
  try {
    ctx = await requirePermission("patients", "create", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { error: err.message };
    }
    return { error: "Não autorizado." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = patientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const patientsHref = `/dashboard/${tenantSlug}/pacientes`;
  const redirectHref = `${patientsHref}?created=1`;

  try {
    const currentPatientCount = await prisma.patient.count({
      where: { nutritionistId: ctx.nutritionistId, status: "ACTIVE" },
    });
    const limitCheck = await usageLimitService.checkEntityLimit(
      ctx.nutritionistId,
      "patients.max",
      currentPatientCount
    );
    if (!limitCheck.allowed) {
      return {
        error: `Limite de ${limitCheck.limit} pacientes do seu plano atual foi atingido. Faça upgrade do plano para cadastrar mais pacientes.`,
      };
    }

    const patient = await createPatient(ctx.nutritionistId, {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      birthDate: data.birthDate || undefined,
      gender: data.gender || undefined,
      weight: typeof data.weight === "number" ? data.weight : undefined,
      height: typeof data.height === "number" ? data.height : undefined,
      goal: data.goal || undefined,
      notes: data.notes || undefined,
    });

    // Audit and welcome email are post-commit side effects. A failure here
    // must not report an error after the patient itself was successfully saved.
    try {
      const headersList = await headers();
      const userAgent = headersList.get("user-agent") || undefined;
      const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

      await auditLogService.record({
        tenantId: ctx.nutritionistId,
        actor: {
          userId: ctx.userId,
          teamMemberId: ctx.teamMemberId,
          name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
          role: ctx.role,
        },
        action: "patient.create",
        resource: "patient",
        resourceId: patient.id,
        resourceLabelSnapshot: patient.name,
        patientId: patient.id,
        patientNameSnapshot: patient.name,
        result: "SUCCESS",
        changedFields: ["name", "phone", ...(data.email ? ["email"] : []), ...(data.birthDate ? ["birthDate"] : [])],
        requestContext: { ip, userAgent },
      });
    } catch {
      console.error("[PATIENT_CREATE_AUDIT_FAILED] The patient was saved, but audit recording failed.");
    }

    // Generate activation link + send welcome email (fire-and-forget)
    if (patient.email) {
      try {
        const nutritionist = await prisma.nutritionist.findUnique({
          where: { id: ctx.nutritionistId },
          select: { name: true, slug: true },
        });
        if (nutritionist) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nutriopus.com.br";
          generateActivationLink(ctx.nutritionistId, patient.id, appUrl)
            .then((activationUrl) =>
              sendWelcomePatientEmail({
                patientEmail: patient.email!,
                patientName: patient.name,
                nutritionistName: nutritionist.name,
                tenantSlug: nutritionist.slug,
                activationUrl,
              }).catch(() => {})
            )
            .catch(() => {});
        }
      } catch {
        console.error("[PATIENT_CREATE_WELCOME_EMAIL_FAILED] The patient was saved, but welcome email setup failed.");
      }
    }

    try {
      revalidatePath(`/dashboard/${tenantSlug}`);
      revalidatePath(patientsHref);
    } catch {
      console.error("[PATIENT_CREATE_CACHE_INVALIDATION_FAILED] The patient was saved, but cache invalidation failed.");
    }
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao criar paciente. Tente novamente." };
  }

  redirect(redirectHref);
}
