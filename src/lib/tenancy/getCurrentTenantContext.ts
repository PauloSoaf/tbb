import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/cookies";

export const getCurrentTenantContext = cache(async () => {
  const session = await getSessionFromCookies();
  if (!session) return null;
  return {
    workspaceId: session.workspaceId,
    userId: session.userId,
    sessionId: session.sessionId,
    membershipId: session.membership.id,
    workspace: { id: session.workspace.id, name: session.workspace.name,
      timezone: session.workspace.timezone, locale: session.workspace.locale, currency: session.workspace.currency },
    user: { id: session.user.id, name: session.user.name, email: session.user.email, isGlobalAdmin: session.user.isGlobalAdmin },
    role: session.membership.role,
  };
});
export type WorkspaceContext = NonNullable<Awaited<ReturnType<typeof getCurrentTenantContext>>>;
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const context = await getCurrentTenantContext();
  if (!context) redirect("/login");
  return context;
}
export const requireWorkspace = getWorkspaceContext;
