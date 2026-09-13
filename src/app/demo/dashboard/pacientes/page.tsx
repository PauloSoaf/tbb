"use client";

// Demo patients list = the REAL PacientesPageClient fed with mock rows.
import { PacientesPageClient } from "@/components/patients/PacientesPageClient";
import { useDemo } from "@/demo/demo-context";
import type { DemoPatient } from "@/demo/demo-data";

function toPatientRow(p: DemoPatient) {
  const latest = p.weights[p.weights.length - 1];
  const birthYear = new Date().getFullYear() - p.age;
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
    birthDate: new Date(`${birthYear}-01-15T00:00:00`),
    weight: latest?.weight ?? null,
    height: p.heightCm,
    goal: p.objective,
    status: "ACTIVE",
    anamneseResponses: [{ submittedAt: new Date("2026-06-20T09:00:00") }],
    wellnessCheckins: [{ mood: 4, energy: 4, date: new Date() }],
    appointments: [{ date: new Date("2026-07-08T09:00:00") }],
    patientTags: p.tags.map((label) => ({ label, color: "#2563eb" })),
  };
}

export default function DemoPatientsPage() {
  const { patients } = useDemo();

  return (
    <PacientesPageClient
      tenant="demo"
      patients={patients.map(toPatientRow)}
      availableTags={[...new Set(patients.flatMap((p) => p.tags))].map((label) => ({ label, color: "#2563eb" }))}
      stats={{
        totalPatients: patients.length,
        activePatients: patients.length,
        patientsWithoutPlan: 1,
        patientsWithUpcomingAppointments: 3,
      }}
      filters={{}}
    />
  );
}
