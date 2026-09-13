export type MealPlanImageKind = "EDITOR" | "MEAL" | "FOOD_ITEM" | "LOGO";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
// This is a client-side guard only. The server remains authoritative because
// plan-specific single-upload and storage-quota limits can be lower.
export const MAX_MEAL_PLAN_IMAGE_BYTES = 10 * 1024 * 1024;

export class MealPlanImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealPlanImageUploadError";
  }
}

export function validateMealPlanImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new MealPlanImageUploadError("meal_plan_clinical.images.invalid_type");
  }

  if (file.size <= 0) {
    throw new MealPlanImageUploadError("meal_plan_clinical.images.invalid_file");
  }

  if (file.size > MAX_MEAL_PLAN_IMAGE_BYTES) {
    throw new MealPlanImageUploadError("meal_plan_clinical.images.file_too_large");
  }
}

export async function uploadMealPlanImage(input: {
  file: File;
  planId: string;
  kind: MealPlanImageKind;
  targetId?: string | null;
}): Promise<{ url: string; storageKey?: string | null }> {
  validateMealPlanImage(input.file);

  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("planId", input.planId);
  formData.append("kind", input.kind);
  if (input.targetId) formData.append("targetId", input.targetId);

  const response = await fetch("/api/meal-plans/images", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null) as { url?: unknown; storageKey?: unknown; error?: unknown } | null;
  if (!response.ok || !payload || typeof payload.url !== "string") {
    const message = typeof payload?.error === "string" ? payload.error : "meal_plan_clinical.images.upload_error";
    throw new MealPlanImageUploadError(message);
  }

  return {
    url: payload.url,
    storageKey: typeof payload.storageKey === "string" ? payload.storageKey : null,
  };
}

export async function deleteMealPlanImage(input: { planId: string; url: string }): Promise<void> {
  const response = await fetch("/api/meal-plans/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  // A structured image can be cleaned up by an immediate relational delete
  // and then again by the next draft reconciliation. Treat an already-gone
  // tracked file as a successful, idempotent cleanup.
  if (response.ok || response.status === 404) return;

  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  throw new MealPlanImageUploadError(
    typeof payload?.error === "string" ? payload.error : "meal_plan_clinical.images.delete_error"
  );
}
