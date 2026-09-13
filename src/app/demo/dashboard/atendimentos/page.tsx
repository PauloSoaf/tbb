"use client";

// Demo care sessions = the REAL AtendimentosPageClient fed with mock sessions.
import { AtendimentosPageClient } from "@/components/atendimentos/AtendimentosPageClient";
import { useDemo } from "@/demo/demo-context";

export default function DemoCareSessionsPage() {
  const { appointments, patients } = useDemo();

  const sessions = appointments
    .filter((a) => a.mode === "ONLINE")
    .map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status === "DONE" ? "COMPLETED" : "SCHEDULED",
      createdAt: new Date(`${a.date}T${a.time}:00`).toISOString(),
      patient: { name: patients.find((p) => p.id === a.patientId)?.name ?? "" },
    }));

  return <AtendimentosPageClient tenant="demo" sessions={sessions} />;
}
