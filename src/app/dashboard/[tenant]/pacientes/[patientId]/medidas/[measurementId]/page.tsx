import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Pencil } from "lucide-react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { getPatientMeasurementById } from "@/services/patient-measurement.service";
import { formatMeasurement } from "@/lib/utils/formatMeasurement";
import { MeasurementSourceBadge } from "@/components/anthropometry/MeasurementSourceBadge";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

export const metadata: Metadata = {
  title: "Detalhe da Avaliação | NutriOpus",
};

interface MeasurementDetailPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
    measurementId: string;
  }>;
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 flex justify-between items-center border-b border-border-neutral last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default async function MeasurementDetailPage(props: MeasurementDetailPageProps) {
  const { tenant, patientId: patientRouteParam, measurementId } = await props.params;

  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientRouteParam);

  const patient = await getPatientById(nutritionist.id, patientId);
  const measurement = await getPatientMeasurementById(nutritionist.id, measurementId);

  if (!patient || !measurement || measurement.patientId !== patientId) {
    notFound();
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PendingButtonLink
            href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes`}
            pendingLabel="Voltando..."
            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para histórico
          </PendingButtonLink>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            Avaliação Antropométrica
            <MeasurementSourceBadge source={measurement.source} className="text-sm" />
          </h1>
          <p className="text-text-secondary mt-1">
            {patient.name} • {format(new Date(measurement.measuredAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <PendingButtonLink
          href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes/${measurementId}/editar`}
          pendingLabel="Abrindo..."
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-neutral hover:bg-gray-50 text-text-secondary hover:text-text-primary text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Pencil className="w-4 h-4" />
          Editar avaliação
        </PendingButtonLink>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Medidas Principais */}
          <section className="bg-white rounded-xl border border-border-neutral p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Medidas Principais</h2>
            <div className="divide-y divide-border-neutral border-y border-border-neutral">
              <DetailItem label="Peso" value={formatMeasurement(measurement.weight, "kg", 1)} />
              <DetailItem label="Altura" value={formatMeasurement(measurement.height, "m", 2)} />
              <DetailItem 
                label="IMC" 
                value={
                  <div className="flex items-center gap-2">
                    {formatMeasurement(measurement.bmi, "", 1)}
                    {measurement.bmiClassification && (
                      <span className="text-xs text-text-secondary font-normal">({measurement.bmiClassification})</span>
                    )}
                  </div>
                } 
              />
            </div>
          </section>

          {/* Composição Corporal */}
          <section className="bg-white rounded-xl border border-border-neutral p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Composição Corporal</h2>
            <div className="divide-y divide-border-neutral border-y border-border-neutral">
              <DetailItem label="% Gordura" value={formatMeasurement(measurement.bodyFatPercentage, "%", 1)} />
              <DetailItem label="Massa Gorda" value={formatMeasurement(measurement.bodyFatKg, "kg", 1)} />
              <DetailItem label="Massa Magra" value={formatMeasurement(measurement.leanMassKg, "kg", 1)} />
            </div>
          </section>
          
          {/* Observações */}
          {measurement.notes && (
            <section className="bg-white rounded-xl border border-border-neutral p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-3">Observações Clínicas</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{measurement.notes}</p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* Circunferências Básicas */}
          <section className="bg-white rounded-xl border border-border-neutral p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Circunferências Básicas</h2>
            <div className="divide-y divide-border-neutral border-y border-border-neutral">
              <DetailItem label="Cintura" value={formatMeasurement(measurement.waist, "cm", 1)} />
              <DetailItem label="Quadril" value={formatMeasurement(measurement.hip, "cm", 1)} />
              <DetailItem label="Rel. Cintura/Quadril" value={formatMeasurement(measurement.waistHipRatio, "", 2)} />
            </div>
          </section>

          {/* Circunferências Complementares */}
          <section className="bg-white rounded-xl border border-border-neutral p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Circunferências Complementares</h2>
            <div className="divide-y divide-border-neutral border-y border-border-neutral">
              <DetailItem label="Pescoço" value={formatMeasurement(measurement.neck, "cm", 1)} />
              <DetailItem label="Tórax" value={formatMeasurement(measurement.chest, "cm", 1)} />
              <DetailItem label="Abdômen" value={formatMeasurement(measurement.abdomen, "cm", 1)} />
              <DetailItem label="Braço relaxado" value={formatMeasurement(measurement.relaxedArm, "cm", 1)} />
              <DetailItem label="Braço contraído" value={formatMeasurement(measurement.contractedArm, "cm", 1)} />
              <DetailItem label="Antebraço" value={formatMeasurement(measurement.forearm, "cm", 1)} />
              <DetailItem label="Coxa" value={formatMeasurement(measurement.thigh, "cm", 1)} />
              <DetailItem label="Panturrilha" value={formatMeasurement(measurement.calf, "cm", 1)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
