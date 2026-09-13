"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, UserPlus } from "lucide-react";
import { duplicateTemplateAction, applyTemplateToPatientAction } from "@/actions/template.action";
import { toast } from "sonner";
import { AsyncButton } from "@/components/ui/AsyncButton";


export function TemplateActionButtons({ tenantSlug, templateId, isNative, patients }: { tenantSlug: string; templateId: string; isNative: boolean, patients: {id: string, name: string}[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [pendingAction, setPendingAction] = useState<"duplicate" | "apply" | null>(null);

  const handleDuplicate = () => {
    setPendingAction("duplicate");
    startTransition(async () => {
      try {
        const result = await duplicateTemplateAction(tenantSlug, templateId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Modelo duplicado com sucesso!");
          router.push(`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${result.newTemplateId}`);
        }
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleUseForPatient = () => {
    if (!selectedPatientId) return;
    setPendingAction("apply");
    startTransition(async () => {
      try {
        const result = await applyTemplateToPatientAction(tenantSlug, templateId, selectedPatientId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Plano criado com sucesso para o paciente!");
          setIsModalOpen(false);
          router.push(`/dashboard/${tenantSlug}/pacientes/${selectedPatientId}/planos/${result.newPlanId}`);
        }
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 mt-6 md:mt-0">
        <AsyncButton
          onClick={handleDuplicate}
          pending={isPending && pendingAction === "duplicate"}
          pendingLabel="Duplicando..."
          disabled={isPending && pendingAction !== "duplicate"}
          className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue border border-brand-blue/30 rounded-lg font-medium hover:bg-brand-blue-soft transition-colors disabled:opacity-70 text-sm"
        >
          <Copy className="w-4 h-4" />
          Duplicar Modelo
        </AsyncButton>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:opacity-70 text-sm shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          Usar para Paciente
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">Usar Modelo</h2>
              <p className="text-sm text-text-secondary mb-6">
                Selecione o paciente para o qual deseja criar este plano alimentar baseado neste modelo.
              </p>

              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue mb-6"
              >
                <option value="">Selecione um paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <AsyncButton
                  onClick={handleUseForPatient}
                  pending={isPending && pendingAction === "apply"}
                  pendingLabel="Criando..."
                  disabled={!selectedPatientId || (isPending && pendingAction !== "apply")}
                  className="px-4 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:opacity-70 text-sm"
                >
                  Criar Plano
                </AsyncButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
