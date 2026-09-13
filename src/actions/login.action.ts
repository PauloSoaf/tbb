"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/validation/auth.schema";
import { authenticateUser } from "@/services/auth.service";
import { createSessionCookie } from "@/lib/auth/cookies";
import { auditLogService } from "@/services/audit-log.service";
import { globalAuditLogService } from "@/services/global-audit-log.service";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await authenticateUser(parsed.data.email, parsed.data.password);

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

  if (!result.success || !result.token) {
    // A failed sign-in may not be attributable to a clinic yet. AuditLog is
    // tenant-scoped and has a required foreign key, so this belongs in the
    // platform-wide log instead of using a fabricated tenant id.
    await globalAuditLogService.record({
      actor: {
        userId: "unauthenticated",
        name: parsed.data.email,
        role: "UNKNOWN",
      },
      action: "session.login.failed",
      resource: "session",
      resourceId: parsed.data.email,
      result: "FAILURE",
      reason: result.error || "Erro ao fazer login",
    });
    return { error: result.error || "Erro ao fazer login" };
  }

  const authenticatedUser = result.user;
  if (!authenticatedUser?.nutritionistId) {
    await globalAuditLogService.record({
      actor: {
        userId: authenticatedUser?.id || "unknown",
        name: authenticatedUser?.name || parsed.data.email,
        role: authenticatedUser?.role || "UNKNOWN",
      },
      action: "session.login.failed",
      resource: "session",
      resourceId: authenticatedUser?.id || parsed.data.email,
      result: "FAILURE",
      reason: "Usuário autenticado sem tenant associado",
    });
    return { error: "Não foi possível identificar a clínica desta conta." };
  }

  await auditLogService.record({
    tenantId: authenticatedUser.nutritionistId,
    actor: {
      userId: authenticatedUser.id,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
    },
    action: "session.login",
    resource: "session",
    resourceId: authenticatedUser.id,
    result: "SUCCESS",
    requestContext: { ip, userAgent },
  });

  const cookieStore = await cookies();
  const sessionCookie = createSessionCookie(result.token);
  cookieStore.set(sessionCookie);

  if (authenticatedUser.role === "GLOBAL_ADMIN") {
    redirect("/admin");
  }

  redirect(`/dashboard/${result.nutritionistSlug}`);
}
