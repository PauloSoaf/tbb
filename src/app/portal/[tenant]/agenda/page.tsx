import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minhas Consultas" };

import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Check, X, Clock } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-brand-blue",
  DONE: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  DONE: "Realizada",
  CANCELED: "Cancelada",
};

export default async function AgendaPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { patient } = await getPortalPatientAction(tenant);
  const allAppointments = (patient?.appointments ?? []) as Array<{
    id: string; date: Date | string; startTime: string | null; endTime: string | null;
    mode: string; status: string; notes: string | null;
  }>;

  const now = new Date();
  const upcoming = allAppointments.filter((a) => new Date(a.date) >= now && a.status === "SCHEDULED").reverse();
  const past = allAppointments.filter((a) => new Date(a.date) < now || a.status !== "SCHEDULED");

  const AppointmentCard = ({ a }: { a: typeof allAppointments[0] }) => (
    <div className={`bg-white rounded-2xl border border-border-neutral p-4 ${a.status === "CANCELED" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary">
            {format(new Date(a.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
            {a.startTime && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{a.startTime}{a.endTime ? ` – ${a.endTime}` : ""}</span>
            )}
            <span>{a.mode === "ONLINE" ? "Online" : "Presencial"}</span>
          </div>
          {a.notes && <p className="text-sm text-text-secondary mt-2 italic">{a.notes}</p>}
        </div>
        <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? STATUS_BADGE.SCHEDULED}`}>
          {a.status === "DONE" ? <Check className="w-3 h-3" /> : a.status === "CANCELED" ? <X className="w-3 h-3" /> : null}
          {STATUS_LABELS[a.status] ?? a.status}
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Minhas Consultas</h1>

      {allAppointments.length === 0 ? (
        <div className="text-center text-text-secondary mt-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhuma consulta registrada ainda.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Próximas</h2>
              <div className="space-y-3">
                {upcoming.map((a) => <AppointmentCard key={a.id} a={a} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Histórico</h2>
              <div className="space-y-3">
                {past.map((a) => <AppointmentCard key={a.id} a={a} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
