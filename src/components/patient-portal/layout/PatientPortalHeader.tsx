"use client";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LangToggle } from "@/components/layout/LangToggle";
import { PatientProfileDropdown } from "./PatientProfileDropdown";

interface PatientPortalHeaderProps {
  tenantSlug: string;
  pageTitle?: string;
  pageSubtitle?: string;
  patientName: string;
}

export function PatientPortalHeader({
  tenantSlug,
  pageTitle,
  pageSubtitle,
  patientName,
}: PatientPortalHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[var(--navbar-border)] bg-[var(--navbar-background)] px-4 text-[var(--navbar-foreground)] backdrop-blur-md">
      {/* Left: page title */}
      <div className="flex-1 min-w-0">
        {pageTitle && (
          <h1 className="text-sm font-semibold text-text-primary truncate">{pageTitle}</h1>
        )}
        {pageSubtitle && (
          <p className="text-xs text-text-secondary truncate hidden sm:block">{pageSubtitle}</p>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="hidden sm:block"><LangToggle /></div>
        <ThemeToggle />
        <div className="w-px h-5 bg-border-neutral mx-1" />
        <PatientProfileDropdown tenantSlug={tenantSlug} name={patientName} />
      </div>
    </header>
  );
}
