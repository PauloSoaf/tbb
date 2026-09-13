import Link from "next/link";
import { Bell, CalendarClock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/navigation/routes";
import { getPatientHref } from "@/services/patient-route.service";

interface RemindersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function RemindersPage({ params }: RemindersPageProps) {
  const { tenant } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);

  const reminders = await prisma.patientReminder.findMany({
    where: { nutritionistId: nutritionist.id },
    include: {
      patient: {
        select: { id: true, name: true, phone: true, email: true, birthDate: true, status: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { nextSendAt: "asc" }],
  });

  const dueSoonThreshold = new Date();
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 7);
  const activeCount = reminders.filter((reminder) => reminder.isActive).length;
  const dueSoonCount = reminders.filter((reminder) => reminder.isActive && reminder.nextSendAt <= dueSoonThreshold).length;

  return (
    <div className="min-h-screen bg-surface-warm">
      <DashboardHeader
        title="Lembretes"
        subtitle={`${activeCount} ativos, ${dueSoonCount} nos proximos 7 dias`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard(tenant) },
          { label: "Lembretes", current: true },
        ]}
      />

      <main className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Ativos" value={activeCount} />
          <SummaryCard label="Proximos 7 dias" value={dueSoonCount} />
          <SummaryCard label="Total" value={reminders.length} />
        </section>

        <section className="rounded-xl border border-border-neutral bg-card-bg shadow-sm">
          <div className="flex items-center gap-2 border-b border-border-neutral px-5 py-4">
            <Bell className="h-5 w-5 text-brand-blue" />
            <h2 className="text-base font-semibold text-text-primary">Lembretes dos pacientes</h2>
          </div>

          {reminders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-text-primary">Nenhum lembrete configurado.</p>
              <p className="mt-1 text-sm text-text-secondary">
                Crie lembretes no prontuario de cada paciente, na aba Metas e Lembretes.
              </p>
              <Link
                href={routes.patients(tenant)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-hover"
              >
                Abrir pacientes
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-neutral">
              {reminders.map((reminder) => (
                <Link
                  key={reminder.id}
                  href={`${getPatientHref({ tenant, patient: reminder.patient })}#goals`}
                  prefetch={false}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-warm/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text-primary">{reminder.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reminder.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {reminder.isActive ? "Ativo" : "Pausado"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{reminder.patient.name}</p>
                    {reminder.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{reminder.body}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-text-secondary">
                    <CalendarClock className="h-4 w-4 text-brand-blue" />
                    {format(new Date(reminder.nextSendAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border-neutral bg-card-bg p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
