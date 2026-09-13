"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PatientActionSidebar } from "./PatientActionSidebar";

const STORAGE_KEY = "patient-action-sidebar-expanded";

function usePersistedExpanded(): [boolean, () => void] {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        queueMicrotask(() => setExpanded(stored === "1"));
      }
    } catch {
      // localStorage unavailable (privacy mode) — default collapsed
    }
  }, []);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failure — state still updates for this session
      }
      return next;
    });
  }, []);

  return [expanded, toggle];
}

interface PatientRecordPageLayoutProps {
  tenant: string;
  patient: { id: string; name: string; email?: string | null };
  main: ReactNode;
  clinicalAside: ReactNode;
}

/**
 * Real CSS Grid layout for the patient record screen — three named grid
 * areas (main / aside / rail) repositioned per breakpoint via
 * `grid-template-areas`, never via position:fixed/absolute overlays.
 *
 * Breakpoints:
 * - < lg (< 1024px): single column, stacked main → clinical aside → action
 *   toolbar (rendered as a horizontal bar by PatientActionSidebar itself).
 * - lg (1024–1279px): main + collapsed action rail side by side; clinical
 *   aside flows full-width below (not enough room for 3 real columns yet).
 * - xl+ (>= 1280px): three real columns. The rail's expand toggle becomes
 *   active here, growing its OWN grid track (300–340px) and shrinking the
 *   aside's track — it pushes content, it never covers it.
 */
export function PatientRecordPageLayout({ tenant, patient, main, clinicalAside }: PatientRecordPageLayoutProps) {
  const [expanded, toggleExpanded] = usePersistedExpanded();

  return (
    <div
      className={[
        "grid w-full max-w-none gap-5 px-4 py-6 sm:px-5 lg:px-6",
        "grid-cols-1 [grid-template-areas:'main'_'aside'_'rail']",
        "lg:grid-cols-[minmax(0,1fr)_92px] lg:[grid-template-areas:'main_rail'_'aside_aside']",
        expanded
          ? "xl:grid-cols-[minmax(0,1fr)_300px_320px] xl:[grid-template-areas:'main_aside_rail']"
          : "xl:grid-cols-[minmax(0,1fr)_344px_92px] xl:[grid-template-areas:'main_aside_rail']",
        expanded
          ? "2xl:grid-cols-[minmax(0,1fr)_320px_340px]"
          : "2xl:grid-cols-[minmax(0,1fr)_368px_96px]",
      ].join(" ")}
    >
      <div className="min-w-0 [grid-area:main]">{main}</div>
      <div className="min-w-0 [grid-area:aside]">{clinicalAside}</div>
      <div className="[grid-area:rail] lg:sticky lg:top-24 lg:h-fit lg:max-h-[calc(100vh-7rem)]">
        <PatientActionSidebar
          tenant={tenant}
          patient={patient}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
        />
      </div>
    </div>
  );
}
