"use client";

// Demo portal layout = the REAL patient portal shell (PatientPortalShell →
// PatientPortalSidebar/Header/MobileNav), with tenant="demo". Links built by
// the real shell point at /portal/demo/... — the bridge bounces them back
// into /demo/portal/*.

import { PatientPortalShell } from "@/components/patient-portal/layout/PatientPortalShell";
import { DemoTopBanner } from "@/demo/components/DemoTopBanner";
import { demoPatientUser } from "@/demo/demo-data";

export default function DemoPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoTopBanner variant="portal" />
      <PatientPortalShell
        tenantSlug="demo"
        patientName={demoPatientUser.name}
        patientSlug="debora-demo"
        nutritionistWhatsApp={null}
      >
        {children}
      </PatientPortalShell>
    </>
  );
}
