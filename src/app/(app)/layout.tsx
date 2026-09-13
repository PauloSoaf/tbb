import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { FloatingActionDock } from "@/components/floating-assistant/FloatingActionDock";

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const context = await getWorkspaceContext();
  const rows = await prisma.notification.findMany({
    where: { workspaceId: context.workspaceId, OR: [{ userId: null }, { userId: context.userId }] },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const notifications = rows.map((item) => ({ ...item, readAt: item.readAt?.toISOString() || null, createdAt: item.createdAt.toISOString() }));
  return <AppShell workspaceName={context.workspace.name} userName={context.user.name} isAdmin={context.user.isGlobalAdmin} notifications={notifications}>
    {children}<FloatingActionDock workspaceId={context.workspaceId}/>
  </AppShell>;
}
