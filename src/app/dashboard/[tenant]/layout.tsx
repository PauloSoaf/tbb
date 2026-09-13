import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getCurrentTenantContext } from "@/lib/tenancy/getCurrentTenantContext";
import { PermissionsProvider } from "@/lib/tenancy/PermissionsContext";
import { FloatingActionDock } from "@/components/floating-assistant/FloatingActionDock";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { tenant } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const ctx = await getCurrentTenantContext(tenant);

  return (
    <PermissionsProvider
      permissions={Array.from(ctx?.permissions ?? [])}
      isOwner={ctx?.isOwner ?? false}
      isGlobalAdmin={ctx?.isGlobalAdmin ?? false}
      role={ctx?.role ?? "VIEWER"}
    >
      <div className="flex min-h-screen bg-background">
        <div className="print:hidden">
          <DashboardSidebar
            tenantSlug={tenant}
            nutritionistName={nutritionist.name}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </div>

        <div className="print:hidden">
          <MobileBottomNav tenantSlug={tenant} />
        </div>
        
        <div className="print:hidden">
          <FloatingActionDock tenant={tenant} />
        </div>
      </div>
    </PermissionsProvider>
  );
}
