"use client";

import { useState } from "react";
import { updateAppointmentNotesAction } from "@/actions/appointment.action";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppointmentNotesEditorProps {
  tenantSlug: string;
  appointmentId: string;
  initialNotes: string | null;
}

export function AppointmentNotesEditor({ tenantSlug, appointmentId, initialNotes }: AppointmentNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateAppointmentNotesAction(tenantSlug, appointmentId, notes);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Observações salvas!");
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <div className="mt-3 bg-white p-3 border border-brand-blue/30 rounded-lg shadow-sm">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Adicione observações da consulta..."
          className="w-full text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none resize-none"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border-neutral">
          <button
            onClick={() => {
              setNotes(initialNotes || "");
              setIsEditing(false);
            }}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-blue hover:bg-brand-blue-hover rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white border border-border-neutral rounded-lg relative group">
      <div className="p-3 text-sm text-text-secondary whitespace-pre-wrap">
        {initialNotes ? initialNotes : <span className="italic text-gray-400">Sem observações.</span>}
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-2 right-2 p-1.5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:text-brand-blue border border-border-neutral rounded-md shadow-sm"
        title="Editar observações"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
