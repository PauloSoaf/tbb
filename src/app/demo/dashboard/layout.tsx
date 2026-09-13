"use client";

// Demo dashboard layout = the REAL dashboard shell (same DashboardSidebar,
// same MobileBottomNav, same structure as /dashboard/[tenant]/layout.tsx),
// Shell navigation points directly at /demo/dashboard so active states match;
// inner real components can still use /dashboard/demo/... via the bridge route.
// Only the FloatingActionDock is omitted because its AI drawer calls real actions.

import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DemoTopBanner } from "@/demo/components/DemoTopBanner";
import { demoNutritionist } from "@/demo/demo-data";

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoTopBanner variant="dashboard" />
      <div className="flex min-h-screen bg-background">
        <div className="print:hidden">
          <DashboardSidebar
            tenantSlug="demo"
            nutritionistName={demoNutritionist.name}
            dashboardBaseHref="/demo/dashboard"
            publicPageHref="/demo"
          />
        </div>

        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </div>

        <div className="print:hidden">
          <MobileBottomNav tenantSlug="demo" dashboardBaseHref="/demo/dashboard" />
        </div>
      </div>
    </>
  );
}
