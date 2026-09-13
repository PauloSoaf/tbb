// Query key factories for TanStack Query.
// Keys are hierarchical: ["domain", tenant, id, sub-domain].
// This allows bulk invalidation: invalidateQueries({ queryKey: ["patients", tenant] })
// will clear ALL patient-related queries for that tenant.

export const queryKeys = {
  // ─── Dashboard ──────────────────────────────────────────────────
  dashboard: (tenant: string) => ["dashboard", tenant] as const,
  dashboardStats: (tenant: string) => ["dashboard", tenant, "stats"] as const,
  dashboardAppointments: (tenant: string) => ["dashboard", tenant, "appointments"] as const,
  dashboardMessages: (tenant: string) => ["dashboard", tenant, "messages"] as const,
  dashboardAnamneses: (tenant: string) => ["dashboard", tenant, "anamneses"] as const,
  dashboardAction: (tenant: string) => ["dashboard", tenant, "action"] as const,
  dashboardMood: (tenant: string) => ["dashboard", tenant, "mood"] as const,

  // ─── Patients ────────────────────────────────────────────────────
  patients: (tenant: string) => ["patients", tenant] as const,
  patient: (tenant: string, patientId: string) => ["patients", tenant, patientId] as const,
  patientMealPlans: (tenant: string, patientId: string) => ["patients", tenant, patientId, "mealPlans"] as const,
  patientEvaluations: (tenant: string, patientId: string) => ["patients", tenant, patientId, "evaluations"] as const,
  patientGoals: (tenant: string, patientId: string) => ["patients", tenant, patientId, "goals"] as const,
  patientFiles: (tenant: string, patientId: string) => ["patients", tenant, patientId, "files"] as const,
  patientTimeline: (tenant: string, patientId: string) => ["patients", tenant, patientId, "timeline"] as const,
  patientChat: (tenant: string, patientId: string) => ["patients", tenant, patientId, "chat"] as const,

  // ─── Agenda ──────────────────────────────────────────────────────
  agenda: (tenant: string) => ["agenda", tenant] as const,
  appointments: (tenant: string) => ["appointments", tenant] as const,

  // ─── Care sessions ────────────────────────────────────────────────
  careSessions: (tenant: string) => ["careSessions", tenant] as const,
  careSession: (tenant: string, sessionId: string) => ["careSessions", tenant, sessionId] as const,

  // ─── Portal ───────────────────────────────────────────────────────
  portalMealPlan: (tenant: string) => ["portal", tenant, "mealPlan"] as const,
  portalDiary: (tenant: string) => ["portal", tenant, "diary"] as const,
  portalShopping: (tenant: string) => ["portal", tenant, "shopping"] as const,
  portalCheckin: (tenant: string) => ["portal", tenant, "checkin"] as const,
  portalChat: (tenant: string) => ["portal", tenant, "chat"] as const,
  portalGoals: (tenant: string) => ["portal", tenant, "goals"] as const,
  portalTasks: (tenant: string) => ["portal", tenant, "tasks"] as const,
  portalEvolution: (tenant: string) => ["portal", tenant, "evolution"] as const,
} as const;
