"use client";

// Demo agenda = the REAL AgendaPageClient. Mirrors the real page's URL
// contract (?view=week|month&offset=N) so the client's own week/month
// toggle and prev/next navigation keep working through the demo bridge.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { addMonths, addWeeks, startOfWeek } from "date-fns";
import { AgendaPageClient } from "@/components/appointments/AgendaPageClient";
import { useDemo } from "@/demo/demo-context";

function DemoAgendaContent() {
  const { appointments, patients } = useDemo();
  const searchParams = useSearchParams();

  const isMonthView = searchParams.get("view") === "month";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;
  const now = new Date();
  const baseDate = isMonthView ? addMonths(now, offset) : addWeeks(now, offset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

  return (
    <AgendaPageClient
      tenant="demo"
      nutritionistId="demo-nutritionist"
      offset={offset}
      isMonthView={isMonthView}
      baseDate={baseDate.toISOString()}
      weekStart={weekStart.toISOString()}
      appointments={appointments.map((a) => ({
        id: a.id,
        date: new Date(`${a.date}T${a.time}:00`),
        startTime: a.time,
        endTime: null,
        notes: null,
        status: a.status,
        mode: a.mode === "ONLINE" ? "ONLINE" : "PRESENTIAL",
        patient: {
          id: a.patientId,
          name: patients.find((p) => p.id === a.patientId)?.name ?? "",
          portalEnabled: false,
        },
        careSessions: [],
      }))}
      patients={patients.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}

export default function DemoAgendaPage() {
  return (
    <Suspense>
      <DemoAgendaContent />
    </Suspense>
  );
}
