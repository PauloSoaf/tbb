"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { archivePatientAction } from "@/actions/updatePatient.action";

interface ArchivePatientButtonProps {
  tenantSlug: string;
  patientId: string;
  patientName: string;
}

export function ArchivePatientButton({
  tenantSlug,
  patientId,
  patientName,
}: ArchivePatientButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const result = await archivePatientAction(tenantSlug, patientId);
      if (result?.error) {
        setError(result.error);
        setShowConfirm(false);
      } else {
        router.push(`/dashboard/${tenantSlug}/pacientes`);
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-text-secondary">
          Arquivar <strong>{patientName}</strong>?
        </span>
        <button
          id="btn-confirm-archive"
          onClick={handleArchive}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700
            text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Archive className="w-3.5 h-3.5" />
          )}
          Confirmar
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary
            border border-border-neutral rounded-lg transition-colors"
        >
          Cancelar
        </button>
        {error && <p className="w-full text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      id="btn-archive-patient"
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-2 px-4 py-2 border border-border-neutral
        text-text-secondary hover:border-rose-300 hover:text-rose-600
        text-sm font-medium rounded-lg transition-colors duration-200"
    >
      <Archive className="w-4 h-4" />
      Arquivar
    </button>
  );
}
