"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity } from "lucide-react";
import { PatientMeasurement } from "@prisma/client";
import { formatMeasurement } from "@/lib/utils/formatMeasurement";
import { MeasurementSourceBadge } from "./MeasurementSourceBadge";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface AnthropometrySummaryCardProps {
  tenantSlug: string;
  patientId: string;
  latestMeasurement: PatientMeasurement | null;
}

export function AnthropometrySummaryCard({
  tenantSlug,
  patientId,
  latestMeasurement,
}: AnthropometrySummaryCardProps) {
  const { t } = useI18n();

  if (!latestMeasurement) {
    return (
      <div className="bg-card-bg rounded-xl border border-border-neutral p-6 text-center">
        <Activity className="w-10 h-10 text-text-secondary/30 mx-auto mb-3" />
        <h3 className="font-semibold text-text-primary mb-1">
          {t("anthropometry.no_evaluation_recorded")}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {t("anthropometry.track_progress_desc")}
        </p>
        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/nova`}
          pendingLabel="Abrindo..."
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t("anthropometry.register_first_evaluation")}
        </PendingButtonLink>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-text-primary mb-1">
            {t("anthropometry.latest_evaluation")}
          </h3>
          <p className="text-xs text-text-secondary">
            {format(new Date(latestMeasurement.measuredAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <MeasurementSourceBadge source={latestMeasurement.source} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="p-3 bg-brand-blue-soft rounded-lg">
          <p className="text-xs text-text-secondary font-medium mb-1">Peso</p>
          <p className="text-lg font-bold text-brand-blue tabular-nums">
            {formatMeasurement(latestMeasurement.weight, "kg", 1)}
          </p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-text-secondary font-medium mb-1">Altura</p>
          <p className="text-lg font-bold text-amber-700 tabular-nums">
            {formatMeasurement(latestMeasurement.height, "m", 2)}
          </p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg">
          <p className="text-xs text-text-secondary font-medium mb-1">IMC</p>
          <p className="text-lg font-bold text-emerald-700 tabular-nums">
            {formatMeasurement(latestMeasurement.bmi, "", 1)}
          </p>
          {latestMeasurement.bmiClassification && (
            <p className="text-[10px] text-emerald-600 truncate mt-0.5">
              {latestMeasurement.bmiClassification}
            </p>
          )}
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-text-secondary font-medium mb-1">Gordura</p>
          <p className="text-lg font-bold text-purple-700 tabular-nums">
            {formatMeasurement(latestMeasurement.bodyFatPercentage, "%", 1)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-text-secondary mb-6 border-t border-border-neutral pt-4">
        <div className="flex justify-between">
          <span>Cintura:</span>
          <span className="font-medium text-text-primary">{formatMeasurement(latestMeasurement.waist, "cm", 1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Quadril:</span>
          <span className="font-medium text-text-primary">{formatMeasurement(latestMeasurement.hip, "cm", 1)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes`}
          pendingLabel="Abrindo..."
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-neutral text-text-secondary hover:text-text-primary hover:border-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          Ver histórico
        </PendingButtonLink>
        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/nova`}
          pendingLabel="Abrindo..."
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          Nova avaliação
        </PendingButtonLink>
      </div>
    </div>
  );
}
