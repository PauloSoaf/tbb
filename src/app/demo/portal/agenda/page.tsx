"use client";

import { MapPin, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { demoPatientUser } from "@/demo/demo-data";
import { DemoCard } from "@/demo/components/DemoUi";

export default function DemoPortalAgendaPage() {
  const { t } = useI18n();
  const { appointments } = useDemo();

  const mine = appointments
    .filter((a) => a.patientId === demoPatientUser.patientId)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const statusLabel = {
    SCHEDULED: t("dashboard.appointments.status.scheduled"),
    DONE: t("dashboard.appointments.status.done"),
    CANCELED: t("dashboard.appointments.status.canceled"),
  } as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-text-primary">{t("nav.agenda")}</h1>

      <DemoCard>
        <div className="divide-y divide-border-neutral/60">
          {mine.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-bold text-text-primary">{a.date} · {a.time}</p>
                <p className="text-xs text-text-secondary">{a.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  {a.mode === "ONLINE" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {a.mode === "ONLINE" ? t("dashboard.appointments.online") : t("dashboard.appointments.in_person")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  a.status === "SCHEDULED" ? "bg-brand-blue/10 text-brand-blue" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}>
                  {statusLabel[a.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DemoCard>
    </div>
  );
}
