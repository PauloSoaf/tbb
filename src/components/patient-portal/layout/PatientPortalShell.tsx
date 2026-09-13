"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PatientPortalSidebar } from "./PatientPortalSidebar";
import { PatientPortalHeader } from "./PatientPortalHeader";
import { PatientPortalMobileNav } from "./PatientPortalMobileNav";
import { PatientFloatingDock } from "@/components/patient-portal/floating/PatientFloatingDock";
import { toPatientPortalPrettyPath } from "@/lib/utils/patientPortalRoute";

const STORAGE_KEY = "nutriopus-portal-sidebar-collapsed";

interface PatientPortalShellProps {
  children: React.ReactNode;
  tenantSlug: string;
  patientName: string;
  patientSlug: string;
  nutritionistWhatsApp: string | null;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function PatientPortalShell({
  children,
  tenantSlug,
  patientName,
  patientSlug,
  nutritionistWhatsApp,
  pageTitle,
  pageSubtitle,
}: PatientPortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      setCollapsed(saved === "true");
    });

    const onChange = () => {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    };
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, []);

  useEffect(() => {
    const prettyPath = toPatientPortalPrettyPath(pathname, tenantSlug, patientSlug);
    if (prettyPath !== pathname) {
      router.replace(prettyPath);
    }
  }, [pathname, patientSlug, router, tenantSlug]);

  return (
    <div className="min-h-screen bg-background">
      <PatientPortalSidebar tenantSlug={tenantSlug} patientName={patientName} patientSlug={patientSlug} />

      <div
        className={`pb-20 transition-all duration-300 lg:pb-0 ${collapsed ? "lg:pl-[60px]" : "lg:pl-64"}`}
      >
        <PatientPortalHeader
          tenantSlug={tenantSlug}
          patientName={patientName}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
        />

        <main className="min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>

      <PatientPortalMobileNav tenantSlug={tenantSlug} patientSlug={patientSlug} />
      <PatientFloatingDock tenantSlug={tenantSlug} patientSlug={patientSlug} nutritionistWhatsApp={nutritionistWhatsApp} patientName={patientName} />
    </div>
  );
}
