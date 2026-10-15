import { getWorkspaceContext, getActivePartnerConnection } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { FloatingActionDock } from "@/components/floating-assistant/FloatingActionDock";
import { cookies } from "next/headers";
import { FinancePrivacyProvider } from "@/features/finance/FinancePrivacy";

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const context = await getWorkspaceContext();
  const [rows, connection] = await Promise.all([
    prisma.notification.findMany({
      where: { workspaceId: context.workspaceId, OR: [{ userId: null }, { userId: context.userId }] },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    getActivePartnerConnection(context.workspaceId),
  ]);
  const notifications = rows.map((item) => ({ ...item, readAt: item.readAt?.toISOString() || null, createdAt: item.createdAt.toISOString() }));
  let partnerName: string | null = null;
  if (connection) {
    const partnerWorkspaceId = connection.requesterWorkspaceId === context.workspaceId ? connection.receiverWorkspaceId! : connection.requesterWorkspaceId;
    const partnerWorkspace = await prisma.workspace.findUnique({ where: { id: partnerWorkspaceId }, select: { name: true } });
    partnerName = partnerWorkspace?.name ?? null;
  }
  const privacyEnabled = (await cookies()).get("tbb-finance-privacy")?.value === "1";
  return <FinancePrivacyProvider initialEnabled={privacyEnabled}><AppShell workspaceName={context.workspace.name} userName={context.user.name} isAdmin={context.user.isGlobalAdmin} notifications={notifications} partnerName={partnerName}>
    {children}<FloatingActionDock workspaceId={context.workspaceId}/>
  </AppShell></FinancePrivacyProvider>;
}
