import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "./getCurrentTenantContext";
import { resolvePermission, roleAllows } from "./policy";
export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") { super(message); this.name = "AuthorizationError"; }
}
export async function requirePermission(permission = "READ") {
  const ctx = await getWorkspaceContext();
  if (ctx.role === "OWNER") return ctx;
  const catalog = await prisma.permission.findUnique({ where: { key: permission }, include: {
    rolePermissions: { where: { workspaceId: ctx.workspaceId, role: ctx.role } },
    overrides: { where: { membershipId: ctx.membershipId } },
  } });
  if (!resolvePermission(roleAllows(ctx.role, permission), catalog?.rolePermissions[0]?.enabled, catalog?.overrides[0]?.effect)) {
    throw new AuthorizationError();
  }
  return ctx;
}
export async function requireGlobalAdmin() {
  const ctx = await getWorkspaceContext();
  if (!ctx.user.isGlobalAdmin) throw new AuthorizationError("Área restrita à administração da plataforma.");
  return ctx;
}
export async function assertTenantOwnership(workspaceId: string) {
  const ctx = await getWorkspaceContext();
  if (ctx.workspaceId !== workspaceId) throw new AuthorizationError("Recurso não encontrado neste espaço.");
  return ctx;
}
