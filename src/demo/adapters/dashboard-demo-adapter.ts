// Adapts demo seed data to the EXACT shape the real DashboardPageClient
// expects (DashboardData) — the demo bends to the real components' contract,
// never the other way around.

import type { DashboardData } from "@/components/dashboard/DashboardPageClient";
import { demoAnamneseSummary, demoNutritionist, type DemoAppointment, type DemoPatient, type DemoMessage } from "../demo-data";

function toClientAppointment(a: DemoAppointment, patients: DemoPatient[]) {
  const patient = patients.find((p) => p.id === a.patientId);
  return {
    id: a.id,
    date: new Date(`${a.date}T${a.time}:00`),
    startTime: a.time,
    endTime: null,
    mode: (a.mode === "ONLINE" ? "ONLINE" : "PRESENTIAL") as "ONLINE" | "PRESENTIAL",
    status: a.status as "SCHEDULED" | "DONE" | "CANCELED",
    patient: { id: a.patientId, name: patient?.name ?? "" },
    careSessions: [],
  };
}

export function buildDemoDashboardData(
  patients: DemoPatient[],
  appointments: DemoAppointment[],
  messages: DemoMessage[]
): DashboardData {
  const scheduled = appointments
    .filter((a) => a.status === "SCHEDULED")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const activePatients = patients.filter((p) => !p.status || p.status === "ACTIVE");
  const unread = messages.filter((m) => m.sender === "PATIENT").slice(-3);
  const attention = activePatients.filter((p) => p.clinicalAlert);

  return {
    tenant: "demo",
    nutritionistName: demoNutritionist.name,
    nutritionistHasGoogleToken: false,
    googleCalendarAvailable: false,
    nutritionistBio: null,
    nutritionistCity: demoNutritionist.city,
    nutritionistProfileImageUrl: null,
    stats: {
      totalPatients: activePatients.length,
      newAnamneses: 1,
      reviewedAnamneses: 3,
      patientsWithAttention: attention.length,
      unreadChatMessages: unread.length,
      patientsWithoutActivePlan: 1,
    },
    recentAnamneses: [
      {
        id: "demo-anamnese-1",
        submittedAt: new Date(`${demoAnamneseSummary.receivedAt}T09:00:00`),
        status: "NEW",
        summary: demoAnamneseSummary.highlights.join(" · "),
        attentionPoints: demoAnamneseSummary.highlights.slice(0, 2),
        patient: { id: demoAnamneseSummary.patientId, name: demoAnamneseSummary.patientName },
      },
    ],
    attentionPoints: attention.map((p) => ({
      responseId: `demo-resp-${p.id}`,
      patientId: p.id,
      patientName: p.name,
      attentionPoints: [p.clinicalAlert as string],
    })),
    lowMoodAlerts: [],
    todayCheckins: [
      { mood: 4, energy: 4, patient: { id: patients[0]?.id ?? "", name: patients[0]?.name ?? "" } },
    ],
    patientsInactive: 1,
    birthdays: [{ id: patients[1]?.id ?? "", name: patients[1]?.name ?? "", daysUntil: 3 }],
    todayAppointments: scheduled.slice(0, 2).map((a) => toClientAppointment(a, patients)),
    upcomingAppointments: scheduled.map((a) => toClientAppointment(a, patients)),
    patientsNeedingAction: attention.map((p) => ({
      patientId: p.id,
      patientName: p.name,
      reason: p.clinicalAlert as string,
      recommendation: p.objective,
      href: `/dashboard/demo/pacientes/${p.id}`,
      tone: "amber" as const,
    })),
    unreadMessages: unread.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: new Date(m.at),
      patient: { id: m.patientId, name: patients.find((p) => p.id === m.patientId)?.name ?? "" },
    })),
  };
}
