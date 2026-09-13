"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPatientNameAction } from "@/actions/patient-name.action";
import { getPageLabel } from "./page-label";

export function AIAssistantContextBar({ tenant, patientId }: { tenant: string; patientId: string | null }) {
  const pathname = usePathname();
  const [patientName, setPatientName] = useState<string | null>(null);
  const mode = patientId ? "Paciente atual" : pathname.includes("/ferramentas") ? "Ferramentas" : "Sistema";

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    getPatientNameAction(patientId)
      .then((name) => { if (!cancelled) setPatientName(name); })
      .catch(() => null);
    return () => { cancelled = true; };
  }, [patientId]);

  return (
    <div className="grid grid-cols-1 gap-1 rounded-lg border border-border-neutral bg-surface-warm px-3 py-2 text-xs text-text-secondary">
      <div className="flex items-center justify-between gap-3">
        <span>Modo</span>
        <strong className="text-text-primary">{mode}</strong>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Clínica</span>
        <strong className="truncate text-text-primary">{tenant}</strong>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Página</span>
        <strong className="truncate text-text-primary">{getPageLabel(pathname)}</strong>
      </div>
      {patientId && (
        <div className="flex items-center justify-between gap-3">
          <span>Paciente</span>
          <strong className="truncate text-text-primary">{patientName ?? "…"}</strong>
        </div>
      )}
    </div>
  );
}
