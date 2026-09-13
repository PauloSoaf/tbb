import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { listAppointments } from "@/services/appointment.service";
import { getPatientById } from "@/services/patient.service";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Check, X, Clock } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: "Agendada", className: "bg-blue-50 text-brand-blue" },
  DONE: { label: "Realizada", className: "bg-emerald-50 text-emerald-700" },
  CANCELED: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
};

export default async function PatientConsultasPage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  const [patient, appointments] = await Promise.all([
    getPatientById(session.nutritionistId, patientId),
    listAppointments(session.nutritionistId, { patientId }),
  ]);

  if (!patient) notFound();

  const done = appointments.filter((a) => a.status === "DONE");
  const upcoming = appointments.filter((a) => a.status === "SCHEDULED");
  const canceled = appointments.filter((a) => a.status === "CANCELED");

  return (
    <div className="min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title={`Consultas — ${patient.name}`}
        subtitle={`${done.length} realizadas · ${upcoming.length} agendadas · ${canceled.length} canceladas`}
      />
      <div className="max-w-3xl mx-auto px-4 lg:px-8 space-y-6 pt-6">
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao prontuário
        </Link>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border-neutral p-10 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-text-secondary">Nenhuma consulta registrada.</p>
            <Link
              href={`/dashboard/${tenant}/agenda?patientId=${patientId}`}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue-hover transition-colors"
            >
              Agendar consulta
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {[...appointments].reverse().map((a) => {
              const cfg = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SCHEDULED;
              return (
                <div
                  key={a.id}
                  className={`bg-white rounded-2xl border border-border-neutral p-4 ${a.status === "CANCELED" ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary">
                        {format(new Date(a.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                        {a.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {a.startTime}{a.endTime ? ` – ${a.endTime}` : ""}
                          </span>
                        )}
                        <span>{a.mode === "ONLINE" ? "Online" : "Presencial"}</span>
                      </div>
                      {a.notes && (
                        <p className="text-sm text-text-secondary mt-2 italic border-l-2 border-border-neutral pl-3">
                          {a.notes}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
                      {a.status === "DONE" ? <Check className="w-3 h-3" /> : a.status === "CANCELED" ? <X className="w-3 h-3" /> : null}
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center pt-2">
          <Link
            href={`/dashboard/${tenant}/agenda?patientId=${patientId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue-hover transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Agendar nova consulta
          </Link>
        </div>
      </div>
    </div>
  );
}
