"use server";

import { revalidateTag } from "next/cache";
import { invalidateConfig } from "@/lib/cache/invalidate-nutriopus-cache";
import { NUTRITIONIST_CACHE_TAG } from "@/lib/tenancy/assertTenantAccess";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { nutritionistConfigSchema } from "@/validation/nutritionist.schema";
import { updateNutritionistConfig } from "@/services/nutritionist.service";
import { uploadTrackedFile, StorageQuotaExceededError } from "@/lib/storage/tracked-upload";

export async function updateNutritionistConfigAction(
  tenantSlug: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const session = await getSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenantSlug) {
    return { error: "Não autorizado." };
  }

  const raw = Object.fromEntries(formData.entries());
  // Remove profileImage and profileImageUrl so zod doesn't fail
  const profileImage = formData.get("profileImage") as File | null;
  const removeProfileImage = formData.get("removeProfileImage") === "true";
  delete raw.profileImage;
  delete raw.profileImageUrl;
  delete raw.removeProfileImage;

  const parsed = nutritionistConfigSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  let finalProfileImageUrl: string | null | undefined = undefined;

  if (removeProfileImage) {
    finalProfileImageUrl = null;
  } else if (profileImage && profileImage.size > 0) {
    if (profileImage.size > 5 * 1024 * 1024) {
      return { error: "A imagem de perfil excede o limite de 5MB." };
    }
    try {
      const buffer = Buffer.from(await profileImage.arrayBuffer());
      finalProfileImageUrl = await uploadTrackedFile(session.nutritionistId, buffer, {
        fileName: profileImage.name,
        folder: "profiles",
        purpose: "nutritionist-profile-photo",
        uploadedByUserId: session.userId,
      });
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        return { error: err.message };
      }
      console.error("Profile image upload failed", err);
      return { error: "Falha ao salvar a imagem de perfil." };
    }
  }

  // Convert comma-separated specialties string to array
  const specialties = data.specialtiesRaw
    ? data.specialtiesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    await updateNutritionistConfig(session.nutritionistId, {
      name: data.name,
      crn: data.crn,
      bio: data.bio || undefined,
      whatsapp: data.whatsapp || undefined,
      email: data.email,
      clinicAddress: data.clinicAddress || undefined,
      city: data.city,
      state: data.state,
      profileImageUrl: finalProfileImageUrl === undefined ? undefined : finalProfileImageUrl,
      themePrimaryColor: data.themePrimaryColor || undefined,
      specialties,
    });

    invalidateConfig({ nutritionistId: session.nutritionistId, tenant: tenantSlug });
    // assertTenantAccess caches the nutritionist record under this tag
    revalidateTag(NUTRITIONIST_CACHE_TAG(tenantSlug), { expire: 0 });
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Erro ao salvar configurações." };
  }
}
