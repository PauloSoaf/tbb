import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { AuthorizationError, requirePermission } from "@/lib/tenancy/requirePermission";
import type { TenantContext } from "@/lib/tenancy/getCurrentTenantContext";
import { deleteTrackedFile, StorageQuotaExceededError, uploadTrackedFile } from "@/lib/storage/tracked-upload";
import { auditLogService } from "@/services/audit-log.service";

const uploadRequestSchema = z.object({
  planId: z.string().trim().min(1).max(191),
  kind: z.enum(["EDITOR", "MEAL", "FOOD_ITEM", "LOGO"]),
  targetId: z.string().trim().min(1).max(191).optional(),
});

const deleteRequestSchema = z.object({
  planId: z.string().trim().min(1).max(191),
  // Local storage returns a relative /uploads/... URL while Vercel Blob returns
  // an absolute URL, so this is deliberately not a z.url() check.
  url: z.string().trim().min(1).max(2048),
});

const IMAGE_UPLOAD_PURPOSES = [
  "meal_plan_editor_image",
  "meal_plan_logo",
  "meal_plan_meal_image",
  "meal_plan_food_image",
] as const;

const IMAGE_KIND_CONFIG = {
  EDITOR: { purpose: "meal_plan_editor_image", folder: "editor" },
  LOGO: { purpose: "meal_plan_logo", folder: "logo" },
  MEAL: { purpose: "meal_plan_meal_image", folder: "meals" },
  FOOD_ITEM: { purpose: "meal_plan_food_image", folder: "foods" },
} as const;

type ImageKind = z.infer<typeof uploadRequestSchema>["kind"];

type SupportedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RequestError";
  }
}

function getFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function getOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = getFormString(formData, key)?.trim();
  return value || undefined;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && typeof (value as File).arrayBuffer === "function";
}

function getSupportedImage(mime: string): SupportedImage | null {
  switch (mime.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return { mime: "image/jpeg", extension: "jpg" };
    case "image/png":
      return { mime: "image/png", extension: "png" };
    case "image/webp":
      return { mime: "image/webp", extension: "webp" };
    default:
      return null;
  }
}

/**
 * MIME comes from the browser and is not trustworthy on its own. Verify the
 * lightweight file signature too; full image decoding is intentionally left to
 * the browser/PDF renderer, but non-image uploads must never reach storage.
 */
function hasExpectedImageSignature(buffer: Buffer, mime: SupportedImage["mime"]): boolean {
  if (mime === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

async function getAuthorizedPlan(planId: string) {
  const session = await getSessionFromCookies();
  if (!session) throw new RequestError(401, "Não autorizado.");

  // Resolve the plan first only to discover its real tenant slug. The ensuing
  // permission check still rejects a non-global user attempting another tenant.
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      nutritionistId: true,
      nutritionist: { select: { slug: true } },
    },
  });
  if (!plan) throw new RequestError(404, "Plano alimentar não encontrado.");

  let ctx: TenantContext;
  try {
    ctx = await requirePermission("mealPlans", "edit", plan.nutritionist.slug, { throwOnFailure: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new RequestError(403, "Sem permissão para alterar imagens deste plano.");
    }
    throw error;
  }

  if (ctx.nutritionistId !== plan.nutritionistId) {
    throw new RequestError(403, "Sem permissão para alterar imagens deste plano.");
  }

  return { plan, ctx };
}

async function assertTargetOwnership(
  kind: ImageKind,
  targetId: string | undefined,
  planId: string,
  nutritionistId: string
) {
  if (kind === "EDITOR" || kind === "LOGO") {
    if (targetId) throw new RequestError(400, "Este tipo de imagem não aceita alvo.");
    return;
  }

  // Newly inserted Tiptap nodes do not have a database id until the plan is
  // saved. Their upload remains scoped by the already-authorized plan and the
  // tracked storage ledger. Existing targets are still checked below.
  if (!targetId) return;

  if (kind === "MEAL") {
    const meal = await prisma.meal.findFirst({
      where: { id: targetId, mealPlanId: planId, nutritionistId },
      select: { id: true },
    });
    if (!meal) throw new RequestError(404, "Refeição não encontrada neste plano.");
    return;
  }

  const mealItem = await prisma.mealItem.findFirst({
    where: {
      id: targetId,
      nutritionistId,
      meal: { mealPlanId: planId },
    },
    select: { id: true },
  });
  if (!mealItem) throw new RequestError(404, "Alimento não encontrado neste plano.");
}

async function recordImageAudit(
  ctx: TenantContext,
  action: "mealPlan.image.upload" | "mealPlan.image.delete",
  planId: string,
  metadata: Record<string, string | number | boolean>
) {
  await auditLogService.record({
    tenantId: ctx.nutritionistId,
    actor: {
      userId: ctx.userId,
      teamMemberId: ctx.teamMemberId,
      name: ctx.nutritionist.name,
      role: ctx.role,
    },
    action,
    resource: "mealPlanImage",
    resourceId: planId,
    metadata,
  });
}

function responseForError(error: unknown, fallback: string) {
  if (error instanceof RequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof StorageQuotaExceededError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }

  console.error("[MEAL_PLAN_IMAGE_ROUTE] Unexpected error:", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    // Reject unauthenticated requests before parsing a potentially large
    // multipart body. `getAuthorizedPlan` resolves the complete tenant/RBAC
    // context once the plan id is available below.
    if (!(await getSessionFromCookies())) {
      throw new RequestError(401, "Não autorizado.");
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw new RequestError(400, "Formulário de upload inválido.");
    }

    const parsed = uploadRequestSchema.safeParse({
      planId: getFormString(formData, "planId"),
      kind: getFormString(formData, "kind"),
      targetId: getOptionalFormString(formData, "targetId"),
    });
    if (!parsed.success) throw new RequestError(400, "Dados de upload inválidos.");

    const file = formData.get("file");
    if (!isUploadedFile(file) || file.size <= 0) {
      throw new RequestError(400, "Selecione uma imagem válida.");
    }

    const image = getSupportedImage(file.type);
    if (!image) {
      throw new RequestError(400, "Formato inválido. Use JPG, PNG ou WEBP.");
    }

    const { plan, ctx } = await getAuthorizedPlan(parsed.data.planId);
    await assertTargetOwnership(parsed.data.kind, parsed.data.targetId, plan.id, ctx.nutritionistId);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedImageSignature(buffer, image.mime)) {
      throw new RequestError(400, "O conteúdo do arquivo não corresponde a uma imagem válida.");
    }

    const config = IMAGE_KIND_CONFIG[parsed.data.kind];
    const url = await uploadTrackedFile(ctx.nutritionistId, buffer, {
      fileName: `${parsed.data.kind.toLowerCase()}-${Date.now()}.${image.extension}`,
      folder: `meal-plans/${plan.id}/${config.folder}`,
      purpose: config.purpose,
      resourceId: plan.id,
      uploadedByUserId: ctx.userId,
    });

    await recordImageAudit(ctx, "mealPlan.image.upload", plan.id, {
      kind: parsed.data.kind,
      mime: image.mime,
      sizeBytes: buffer.byteLength,
      purpose: config.purpose,
      hasTarget: Boolean(parsed.data.targetId),
    });

    return NextResponse.json({ url, mime: image.mime, size: buffer.byteLength }, { status: 201 });
  } catch (error) {
    return responseForError(error, "Não foi possível enviar a imagem.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await getSessionFromCookies())) {
      throw new RequestError(401, "Não autorizado.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new RequestError(400, "Dados de remoção inválidos.");
    }

    const parsed = deleteRequestSchema.safeParse(body);
    if (!parsed.success) throw new RequestError(400, "Dados de remoção inválidos.");

    const { plan, ctx } = await getAuthorizedPlan(parsed.data.planId);
    // Never pass an arbitrary public URL to the provider. The image must be in
    // this tenant's tracked ledger, tied to this plan, and created by one of
    // the four plan-image upload purposes above.
    const trackedFile = await prisma.storageFile.findFirst({
      where: {
        tenantId: ctx.nutritionistId,
        url: parsed.data.url,
        resourceId: plan.id,
        purpose: { in: [...IMAGE_UPLOAD_PURPOSES] },
      },
      select: { purpose: true },
    });
    if (!trackedFile) throw new RequestError(404, "Imagem não encontrada neste plano.");

    await deleteTrackedFile(ctx.nutritionistId, parsed.data.url);

    await recordImageAudit(ctx, "mealPlan.image.delete", plan.id, {
      purpose: trackedFile.purpose,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return responseForError(error, "Não foi possível remover a imagem.");
  }
}
