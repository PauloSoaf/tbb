import { getWorkspaceContext } from '@/lib/workspace';
import { AppShell } from '@/components/layout/AppShell';
export default async function ApplicationLayout({children}:{children:React.ReactNode}){const c=await getWorkspaceContext();return <AppShell workspaceName={c.workspace.name} userName={c.user.name} isAdmin={c.user.isGlobalAdmin}>{children}</AppShell>;}
