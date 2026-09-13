"use client";

import { updateAppointmentStatusAction, deleteAppointmentAction, updateAppointmentNotesAction } from "@/actions/appointment.action";
import { useTransition, useState } from "react";
import { Check, X, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppointmentStatusButtonsProps {
  tenantSlug: string;
  appointmentId: string;
  currentStatus: string;
  existingNotes?: string | null;
}

export function AppointmentStatusButtons({
  tenantSlug,
  appointmentId,
  currentStatus,
  existingNotes,
}: AppointmentStatusButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(existingNotes ?? "");

  const handleMarkDone = () => setShowNotesModal(true);

  const handleConfirmDone = () => {
    startTransition(async () => {
      if (notes.trim()) {
        await updateAppointmentNotesAction(tenantSlug, appointmentId, notes.trim());
      }
      const res = await updateAppointmentStatusAction(tenantSlug, appointmentId, "DONE");
      if (res.error) toast.error(res.error);
      else toast.success("Consulta marcada como realizada.");
      setShowNotesModal(false);
    });
  };

  const handleUpdate = (status: "DONE" | "CANCELED" | "SCHEDULED") => {
    startTransition(async () => {
      const res = await updateAppointmentStatusAction(tenantSlug, appointmentId, status);
      if (res.error) toast.error(res.error);
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    startTransition(async () => {
      const res = await deleteAppointmentAction(tenantSlug, appointmentId);
      if (res.error) toast.error(res.error);
      else toast.success("Consulta excluída.");
      setConfirmDelete(false);
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateAppointmentNotesAction(tenantSlug, appointmentId, notes.trim());
      toast.success("Notas salvas.");
      setShowNotesModal(false);
    });
  };

  if (currentStatus === "DONE" || currentStatus === "CANCELED") {
    const isDone = currentStatus === "DONE";
    return (
      <>
        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNotesModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-brand-blue" />
                <h3 className="font-semibold text-text-primary text-sm">Notas da consulta</h3>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Registre observações clínicas, evolução do paciente, próximos passos..."
                rows={4}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-xl border border-border-neutral focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 resize-none transition-all"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 py-2 rounded-xl border border-border-neutral text-sm text-text-secondary hover:bg-warm-beige transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
                  {isPending ? "Salvando…" : "Salvar notas"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
            isDone ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
          }`}>
            {isDone ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {isDone ? "Realizada" : "Cancelada"}
          </span>
          <button
            onClick={() => setShowNotesModal(true)}
            disabled={isPending}
            title="Editar notas"
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            title={confirmDelete ? "Clique novamente para confirmar" : "Excluir consulta"}
            className={`p-1.5 rounded-lg text-xs transition-colors disabled:opacity-50 ${
              confirmDelete ? "bg-red-100 text-red-700" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
            }`}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNotesModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-text-primary text-sm">Notas da consulta (opcional)</h3>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Registre observações clínicas, evolução do paciente, próximos passos..."
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border-neutral focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 resize-none transition-all"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowNotesModal(false)}
                className="flex-1 py-2 rounded-xl border border-border-neutral text-sm text-text-secondary hover:bg-warm-beige transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDone}
                disabled={isPending}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Salvando…" : "Marcar como realizada"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleMarkDone}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100
            text-emerald-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Check className="w-3 h-3" />
          Realizada
        </button>
        <button
          onClick={() => handleUpdate("CANCELED")}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100
            text-red-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Cancelar
        </button>
      </div>
    </>
  );
}
