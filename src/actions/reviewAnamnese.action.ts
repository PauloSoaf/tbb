"use server";

import { invalidateAfterAnamnese } from "@/lib/cache/invalidate-nutriopus-cache";
import { markAsReviewed } from "@/services/anamnese.service";
import { requirePermission } from "@/lib/tenancy/requirePermission";

export async function reviewAnamneseAction(responseId: string) {
  let ctx;
  try {
    ctx = await requirePermission("anamnesis", "edit", undefined, { throwOnFailure: true });
  } catch {
    return { error: "Não autorizado" };
  }

  const result = await markAsReviewed(ctx.nutritionistId, responseId);

  if (!result.success) {
    return { error: result.error };
  }

  invalidateAfterAnamnese({
    nutritionistId: ctx.nutritionistId,
    tenant: ctx.slug,
    responseId,
  });

  return { success: true };
}
