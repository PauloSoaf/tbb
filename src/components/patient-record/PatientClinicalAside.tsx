import type { ReactNode } from "react";

/**
 * Presentational wrapper for the clinical column (goals, reminders,
 * evolution, contact info, portal status, sparklines, etc). Pure layout —
 * no state — so it stays a server component; the actual cards are streamed
 * in by the page as children.
 */
export function PatientClinicalAside({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
      {children}
    </div>
  );
}
