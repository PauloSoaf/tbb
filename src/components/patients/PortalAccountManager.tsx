"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CalendarDays, ShieldCheck, ShieldOff, Trash2, Archive, UserPlus, Loader2 } from "lucide-react";
import { createPortalAccountAdminAction, archivePortalAccountAdminAction, deletePortalAccountAdminAction } from "@/actions/patient-portal.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";


interface PortalAccountManagerProps {
  tenantSlug: string;
  patientId: string;
  patientEmail: string | null;
  daysOnTrack: number;
  doneAppointmentsCount: number;
  portalAccount: {
    status: string;
    activatedAt: Date | null;
    lastLoginAt: Date | null;
  } | null;
}

export function PortalAccountManager({
  tenantSlug,
  patientId,
  patientEmail,
  daysOnTrack,
  doneAppointmentsCount,
  portalAccount,
}: PortalAccountManagerProps) {
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [isLoading, setIsLoading] = useState(false);

  const hasPortal = portalAccount != null;
  const isActive = portalAccount?.status === "ACTIVE";
  const isArchived = portalAccount?.status === "BLOCKED";

  async function handleCreateAccount() {
    if (!patientEmail) {
      toast.error("O paciente precisa ter um e-mail cadastrado.");
      return;
    }
    
    setIsLoading(true);
    const result = await createPortalAccountAdminAction(tenantSlug, patientId);
    setIsLoading(false);

    if (result.success) {
      toast.success("Conta criada com sucesso! A senha padrão é 123456.");
    } else {
      toast.error(result.error);
    }
  }

  async function handleArchiveAccount() {
    setIsLoading(true);
    const result = await archivePortalAccountAdminAction(tenantSlug, patientId);
    setIsLoading(false);

    if (result.success) {
      toast.success("Acesso ao portal arquivado.");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_patient_portal_account.title"),
      description: t("confirmations.delete_patient_portal_account.description"),
      confirmLabel: t("confirmations.delete_patient_portal_account.confirm"),
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }
    
    setIsLoading(true);
    const result = await deletePortalAccountAdminAction(tenantSlug, patientId);
    setIsLoading(false);

    if (result.success) {
      toast.success("Conta apagada com sucesso.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral space-y-3 relative">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary flex items-center gap-1.5">
          <Clock className="w-4 h-4" />Em acompanhamento
        </span>
        <span className="font-semibold text-text-primary dark:text-slate-200">{daysOnTrack} dias</span>
      </div>
      
      {doneAppointmentsCount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />Consultas realizadas
          </span>
          <span className="font-semibold text-text-primary dark:text-slate-200">{doneAppointmentsCount}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary flex items-center gap-1.5">
          {isActive ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldOff className="w-4 h-4 text-gray-400" />}
          Portal
        </span>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
            isArchived ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
            hasPortal ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            "bg-gray-100 text-gray-600 dark:bg-card-bg dark:text-slate-400"
          }`}>
            {isActive ? "Ativo" : isArchived ? "Arquivado" : hasPortal ? "Pendente" : "Sem acesso"}
          </span>

          <div className="flex items-center gap-1">
            {!isActive && !isArchived && (
              <button 
                onClick={handleCreateAccount} 
                disabled={isLoading}
                title="Criar Acesso com senha padrão (123456)"
                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </button>
            )}
            {isActive && (
              <button 
                onClick={handleArchiveAccount} 
                disabled={isLoading}
                title="Bloquear/Arquivar Acesso"
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              </button>
            )}
            {isArchived && (
              <button 
                onClick={handleCreateAccount} 
                disabled={isLoading}
                title="Desbloquear Acesso"
                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              </button>
            )}
            {(isActive || isArchived || hasPortal) && (
              <button 
                onClick={handleDeleteAccount} 
                disabled={isLoading}
                title="Apagar Conta permanentemente"
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isActive && portalAccount?.lastLoginAt && (
        <p className="text-xs text-text-secondary mt-1">
          Último acesso: {format(new Date(portalAccount.lastLoginAt), "dd/MM/yyyy", { locale: ptBR })}
        </p>
      )}
      {confirmDialog}
    </div>
  );
}
