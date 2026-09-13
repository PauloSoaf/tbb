import { AgendaPageClient } from "@/components/appointments/AgendaPageClient";
import { listAppointments } from "@/services/appointment.service";
import { listPatients } from "@/services/patient.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { startOfWeek, addWeeks, addMonths } from "date-fns";

interface AgendaPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ offset?: string; view?: string; semana?: string; patientId?: string }>;
}

export default async function AgendaPage({ params, searchParams }: AgendaPageProps) {
  const { tenant } = await params;
  const searchParamsObj = await searchParams;

  // Backwards compatibility with "semana" param
  const rawOffset = searchParamsObj.offset || searchParamsObj.semana;
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;
  const preselectedPatientId = searchParamsObj.patientId;
  const isMonthView = searchParamsObj.view === "month";

  const { session } = await assertTenantAccess(tenant);

  const baseDate = isMonthView ? addMonths(new Date(), offset) : addWeeks(new Date(), offset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

  const [appointments, patients] = await Promise.all([
    listAppointments(session.nutritionistId, isMonthView ? { monthOf: baseDate } : { weekOf: baseDate }),
    listPatients(session.nutritionistId),
  ]);

  return (
    <AgendaPageClient
      tenant={tenant}
      nutritionistId={session.nutritionistId}
      offset={offset}
      isMonthView={isMonthView}
      baseDate={baseDate.toISOString()}
      weekStart={weekStart.toISOString()}
      appointments={appointments.map((a) => ({
        id: a.id,
        date: a.date,
        startTime: a.startTime ?? null,
        endTime: a.endTime ?? null,
        notes: a.notes ?? null,
        status: a.status,
        mode: a.mode,
        patient: { id: a.patient.id, name: a.patient.name, portalEnabled: false },
        careSessions: (a.careSessions ?? []).map((cs) => ({ id: cs.id })),
      }))}
      patients={patients.map((p) => ({ id: p.id, name: p.name }))}
      preselectedPatientId={preselectedPatientId}
    />
  );
}
