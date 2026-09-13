"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { exportPatientDataAction } from "@/actions/export.action";
import { toast } from "sonner";

interface Props {
  tenantSlug: string;
  patientId: string;
}

export function ExportPatientDataButton({ tenantSlug, patientId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      toast.loading("Compilando dados do paciente...", { id: "export-lgpd" });
      const res = await exportPatientDataAction(tenantSlug, patientId);
      
      if (res.error) {
        toast.error(res.error, { id: "export-lgpd" });
        return;
      }
      
      if (res.data) {
        // Blob and download
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `exportacao_paciente_${patientId}_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Dados exportados com sucesso! (LGPD)", { id: "export-lgpd" });
      }
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand-blue transition-colors w-full p-2 rounded-xl hover:bg-brand-blue/5"
    >
      <Download className="w-4 h-4" />
      {isPending ? "Exportando..." : "Exportar Dados (LGPD)"}
    </button>
  );
}
