"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addPatientWeightAction } from "@/actions/patient-portal.action";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  tenantSlug: string;
}

export function PesoFormClient({ tenantSlug }: Props) {
  const { t } = useI18n();

  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      toast.error(t("patient_portal.weight.error_missing", { defaultValue: "Informe seu peso." }));
      return;
    }

    setLoading(true);
    const measuredAt = new Date(date + "T12:00:00");
    const result = await addPatientWeightAction(tenantSlug, Number(weight), measuredAt);
    setLoading(false);

    if (result.success) {
      toast.success(t("patient_portal.weight.success", { defaultValue: "Peso registrado com sucesso!" }));
      setWeight("");
    } else {
      toast.error(result.error || "Erro ao registrar peso.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border-neutral p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t("patient_portal.weight.current_weight", { defaultValue: "Peso atual (kg)" })}
        </label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          placeholder={t("patient_portal.weight.placeholder", { defaultValue: "Ex: 70.5" })}
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t("patient_portal.weight.date", { defaultValue: "Data da pesagem" })}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          max={new Date().toISOString().split("T")[0]}
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !weight}
        className="w-full bg-brand-blue text-white rounded-xl py-2.5 font-medium text-sm hover:bg-brand-hover transition-colors disabled:opacity-60"
      >
        {loading ? t("patient_portal.weight.submitting", { defaultValue: "Registrando..." }) : t("patient_portal.weight.submit", { defaultValue: "Registrar Peso" })}
      </button>
    </form>
  );
}
