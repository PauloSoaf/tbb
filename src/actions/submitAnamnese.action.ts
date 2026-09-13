"use server";

import { redirect } from "next/navigation";
import { anamneseSchema } from "@/validation/anamnese.schema";
import { submitAnamnese } from "@/services/anamnese.service";
import { getTenantBySlug } from "@/lib/tenancy/getTenantBySlug";
import { sendNewAnamneseNotificationEmail } from "@/services/email.service";
import { auditLogService } from "@/services/audit-log.service";
import { headers } from "next/headers";

export async function submitAnamneseAction(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const tenant = formData.get("tenant") as string;

  const raw = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    birthDate: formData.get("birthDate") as string,
    weight: formData.get("weight") as string,
    height: formData.get("height") as string,
    goal: formData.get("goal") as string,
    diseases: formData.get("diseases") as string,
    surgeries: formData.get("surgeries") as string,
    medications: formData.get("medications") as string,
    familyHistory: formData.get("familyHistory") as string,
    dietaryRoutine: formData.get("dietaryRoutine") as string,
    mealTimes: formData.get("mealTimes") as string,
    sleepHabits: formData.get("sleepHabits") as string,
    gutHealth: formData.get("gutHealth") as string,
    symptoms: formData.get("symptoms") as string,
    allergies: formData.get("allergies") as string,
    intolerances: formData.get("intolerances") as string,
    dietaryRestrictions: formData.get("dietaryRestrictions") as string,
    lgpdConsent: formData.get("lgpdConsent") as string,
  };

  const parsed = anamneseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const nutritionist = await getTenantBySlug(tenant);
  if (!nutritionist) {
    return { error: "Nutricionista não encontrada" };
  }

  try {
    const anamnese = await submitAnamnese(nutritionist.id, parsed.data);

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: nutritionist.id,
      actor: {
        userId: "public_patient",
        name: parsed.data.name,
        role: "PATIENT",
      },
      action: "anamnesis.submit.public",
      resource: "anamnesis",
      resourceId: anamnese.response.id,
      patientId: anamnese.patient.id,
      patientNameSnapshot: parsed.data.name,
      result: "SUCCESS",
      changedFields: ["payload", "lgpdConsent"],
      requestContext: { ip, userAgent },
    });
  } catch {
    return { error: "Erro ao salvar pré-consulta. Tente novamente." };
  }

  // Fire-and-forget: notify nutritionist via email
  void (async () => {
    try {
      await sendNewAnamneseNotificationEmail({
        nutritionistEmail: nutritionist.email,
        nutritionistName: nutritionist.name,
        patientName: parsed.data.name,
        patientPhone: parsed.data.phone,
        tenantSlug: tenant,
      });
    } catch { /* never block */ }
  })();

  redirect(`/${tenant}/pre-consulta/sucesso`);
}
