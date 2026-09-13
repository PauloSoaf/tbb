import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Pencil } from "lucide-react";
import { PatientMeasurement } from "@prisma/client";
import { formatMeasurement } from "@/lib/utils/formatMeasurement";
import { MeasurementSourceBadge } from "./MeasurementSourceBadge";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface AnthropometryMobileCardProps {
  tenantSlug: string;
  patientId: string;
  measurement: PatientMeasurement;
}

export function AnthropometryMobileCard({
  tenantSlug,
  patientId,
  measurement,
}: AnthropometryMobileCardProps) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-text-primary text-sm">
          {format(new Date(measurement.measuredAt), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <MeasurementSourceBadge source={measurement.source} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 bg-warm-surface rounded-lg p-3">
        <div>
          <p className="text-[10px] text-text-secondary font-medium uppercase">Peso</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">
            {formatMeasurement(measurement.weight, "kg", 1)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary font-medium uppercase">IMC</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">
            {formatMeasurement(measurement.bmi, "", 1)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary font-medium uppercase">% Gordura</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">
            {formatMeasurement(measurement.bodyFatPercentage, "%", 1)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-border-neutral">
        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/${measurement.id}`}
          pendingLabel="Abrindo..."
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver detalhes
        </PendingButtonLink>
        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/${measurement.id}/editar`}
          pendingLabel={null}
          aria-label="Editar avaliação"
          className="inline-flex items-center justify-center p-2 border border-border-neutral hover:bg-gray-50 text-text-secondary text-xs font-medium rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </PendingButtonLink>
      </div>
    </div>
  );
}
