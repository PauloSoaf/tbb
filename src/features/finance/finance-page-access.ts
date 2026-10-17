import { AuthorizationError, requirePermission } from "@/lib/workspace";

/** Always authorize READ before touching finance data; WRITE overrides govern the available controls. */
export async function financePageAccess() {
  const context = await requirePermission("READ");
  if (context.role === "OWNER") return { ...context, canWrite: true };
  try {
    await requirePermission("WRITE");
    return { ...context, canWrite: true };
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    return { ...context, canWrite: false };
  }
}
