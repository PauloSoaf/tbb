"use client";

import { useActionState, useEffect, useState } from "react";
import { createAppointmentAction } from "@/actions/appointment.action";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

interface Patient {
  id: string;
  name: string;
}

interface AppointmentFormProps {
  tenantSlug: string;
  patients: Patient[];
  onSuccess?: () => void;
  defaultPatientId?: string;
}

function SubmitButton() {
  const { t } = useI18n();
  return (
    <PendingSubmitButton
      pendingLabel={t("common.loading", { defaultValue: "Agendando..." })}
      className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover
        disabled:opacity-60 disabled:cursor-not-allowed
        text-white text-sm font-medium rounded-lg transition-colors duration-200"
    >
      {t("agenda.schedule_appointment", { defaultValue: "Agendar consulta" })}
    </PendingSubmitButton>
  );
}

export function AppointmentForm({ tenantSlug, patients, defaultPatientId }: AppointmentFormProps) {
  const boundAction = createAppointmentAction.bind(null, tenantSlug);
  const [state, formAction] = useActionState(boundAction, null);
  const searchParams = useSearchParams();
  const urlDate = searchParams.get("date");
  const urlPatientId = searchParams.get("patientId") ?? defaultPatientId ?? "";

  const [selectedTime, setSelectedTime] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(urlDate || today);
  const [selectedPatient, setSelectedPatient] = useState(urlPatientId);

  const { t } = useI18n();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlDate) setDate(urlDate);
  }, [urlDate]);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success) {
      toast.success(t("agenda.appointment_success", { defaultValue: "Consulta agendada com sucesso!" }));
    }
  }, [state, t]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {t("agenda.appointment_success", { defaultValue: "Consulta agendada com sucesso!" })}
        </div>
      )}

      <div>
        <label htmlFor="app-patientId" className="block text-sm font-medium text-text-primary mb-1.5">
          {t("dashboard.stats.patients", { defaultValue: "Paciente" })}
        </label>
        <select
          id="app-patientId"
          name="patientId"
          required
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
        >
          <option value="">{t("agenda.select_patient", { defaultValue: "Selecione um paciente" })}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="app-date" className="block text-sm font-medium text-text-primary mb-1.5">
          {t("agenda.date", { defaultValue: "Data" })}
        </label>
        <input
          id="app-date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="app-startTime" className="block text-sm font-medium text-text-primary">
              {t("agenda.start", { defaultValue: "Início" })}
            </label>
            <div className="flex gap-1">
              {["08:00", "10:00", "14:00", "16:00"].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-text-secondary rounded"
                >
                  {time.split(":")[0]}h
                </button>
              ))}
            </div>
          </div>
          <input
            id="app-startTime"
            name="startTime"
            type="time"
            required
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
              text-sm text-text-primary
              focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
          />
        </div>
        <div>
          <label htmlFor="app-endTime" className="block text-sm font-medium text-text-primary mb-1.5">
            {t("agenda.end", { defaultValue: "Fim" })} <span className="text-text-secondary font-normal">({t("agenda.optional", { defaultValue: "opcional" })})</span>
          </label>
          <input
            id="app-endTime"
            name="endTime"
            type="time"
            className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
              text-sm text-text-primary
              focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
          />
        </div>
      </div>

      <div>
        <label htmlFor="app-mode" className="block text-sm font-medium text-text-primary mb-1.5">
          {t("agenda.mode", { defaultValue: "Modalidade" })}
        </label>
        <select
          id="app-mode"
          name="mode"
          defaultValue="PRESENTIAL"
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
        >
          <option value="PRESENTIAL">{t("dashboard.appointments.in_person", { defaultValue: "Presencial" })}</option>
          <option value="ONLINE">{t("dashboard.appointments.online", { defaultValue: "Online" })}</option>
        </select>
      </div>

      <div>
        <label htmlFor="app-notes" className="block text-sm font-medium text-text-primary mb-1.5">
          {t("agenda.notes", { defaultValue: "Observações" })} <span className="text-text-secondary font-normal">({t("agenda.optional", { defaultValue: "opcional" })})</span>
        </label>
        <textarea
          id="app-notes"
          name="notes"
          rows={2}
          placeholder={t("agenda.notes_placeholder", { defaultValue: "Notas sobre a consulta..." })}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
            resize-none transition-colors duration-200"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
