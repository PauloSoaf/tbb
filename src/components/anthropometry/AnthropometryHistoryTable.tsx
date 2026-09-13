import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Pencil } from "lucide-react";
import { PatientMeasurement } from "@prisma/client";
import { formatMeasurement } from "@/lib/utils/formatMeasurement";
import { MeasurementSourceBadge } from "./MeasurementSourceBadge";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface AnthropometryHistoryTableProps {
  tenantSlug: string;
  patientId: string;
  measurements: PatientMeasurement[];
}

export function AnthropometryHistoryTable({
  tenantSlug,
  patientId,
  measurements,
}: AnthropometryHistoryTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-border-neutral bg-warm-surface">
            <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Data
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Peso
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              IMC
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              % Gordura
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Origem
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-neutral bg-card-bg">
          {measurements.map((m) => (
            <tr key={m.id} className="hover:bg-warm-surface transition-colors">
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-text-primary">
                  {format(new Date(m.measuredAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">
                  {formatMeasurement(m.weight, "kg", 1)}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">
                  {formatMeasurement(m.bmi, "", 1)}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-text-secondary">
                  {formatMeasurement(m.bodyFatPercentage, "%", 1)}
                </span>
              </td>
              <td className="px-6 py-4">
                <MeasurementSourceBadge source={m.source} />
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-3">
                  <PendingButtonLink
                    href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/${m.id}`}
                    pendingLabel={null}
                    aria-label="Ver detalhes"
                    className="inline-flex items-center justify-center text-text-secondary hover:text-brand-blue transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </PendingButtonLink>
                  <PendingButtonLink
                    href={`/dashboard/${tenantSlug}/pacientes/${patientId}/avaliacoes/${m.id}/editar`}
                    pendingLabel={null}
                    aria-label="Editar avaliação"
                    className="inline-flex items-center justify-center text-text-secondary hover:text-brand-blue transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </PendingButtonLink>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
