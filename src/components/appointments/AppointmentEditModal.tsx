"use client";

import { useState } from "react";
import { updateAppointmentAction } from "@/actions/appointment.action";
import { X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

interface Appointment {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  mode: "ONLINE" | "PRESENTIAL";
  notes: string | null;
}

interface Props {
  tenantSlug: string;
  appointment: Appointment;
}

function SaveButton() {
  return (
    <PendingSubmitButton
      pendingLabel="Salvando..."
      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
    >
      Salvar
    </PendingSubmitButton>
  );
}

export function AppointmentEditModal({ tenantSlug, appointment }: Props) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const result = await updateAppointmentAction(tenantSlug, appointment.id, null, formData);
    if (result?.error) {
      toast.error(result.error);
    }
    if (result?.success) {
      toast.success("Consulta atualizada!");
      setOpen(false);
    }
  };

  const dateValue = appointment.date ? new Date(appointment.date).toISOString().split("T")[0] : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar consulta"
        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue-soft transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border-neutral">
              <h2 className="text-base font-semibold text-text-primary">Editar Consulta</h2>
              <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Data</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={dateValue}
                  className="w-full px-3 py-2 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Início</label>
                  <input
                    name="startTime"
                    type="time"
                    required
                    defaultValue={appointment.startTime ?? ""}
                    className="w-full px-3 py-2 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Fim <span className="text-text-secondary font-normal">(opt.)</span>
                  </label>
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={appointment.endTime ?? ""}
                    className="w-full px-3 py-2 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Modalidade</label>
                <select
                  name="mode"
                  defaultValue={appointment.mode}
                  className="w-full px-3 py-2 border border-border-neutral rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                >
                  <option value="PRESENTIAL">Presencial</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Observações <span className="text-text-secondary font-normal">(opt.)</span>
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={appointment.notes ?? ""}
                  className="w-full px-3 py-2 border border-border-neutral rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border border-border-neutral text-sm font-medium text-text-secondary rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <SaveButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
