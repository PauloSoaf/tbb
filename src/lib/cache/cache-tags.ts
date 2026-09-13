// Cache tag generators.
// Rules:
// 1. Always include nutritionistId or patientId — no cross-tenant leaks.
// 2. Be as specific as possible so invalidation is surgical.
// 3. Tags are hierarchical: invalidating the parent (e.g. "dashboard")
//    is a shortcut that covers all child tags. Only do that for mutations
//    that genuinely touch everything.

export const cacheTags = {
  // ─── Dashboard (nutritionist) ────────────────────────────────
  dashboard: (nId: string) => `dashboard:${nId}`,
  dashboardStats: (nId: string) => `dashboard:stats:${nId}`,
  dashboardAnamneses: (nId: string) => `dashboard:anamneses:${nId}`,
  dashboardMessages: (nId: string) => `dashboard:messages:${nId}`,
  dashboardAppointments: (nId: string) => `dashboard:appointments:${nId}`,
  dashboardBirthdays: (nId: string) => `dashboard:birthdays:${nId}`,
  dashboardAttention: (nId: string) => `dashboard:attention:${nId}`,
  dashboardMood: (nId: string) => `dashboard:mood:${nId}`,
  dashboardAction: (nId: string) => `dashboard:action:${nId}`,

  // ─── Patients list ────────────────────────────────────────────
  patients: (nId: string) => `patients:${nId}`,

  // ─── Single patient ───────────────────────────────────────────
  patient: (nId: string, pId: string) => `patient:${nId}:${pId}`,
  patientEvaluations: (nId: string, pId: string) => `patient:evaluations:${nId}:${pId}`,
  patientMealPlans: (nId: string, pId: string) => `patient:mealPlans:${nId}:${pId}`,
  patientFiles: (nId: string, pId: string) => `patient:files:${nId}:${pId}`,
  patientAnamnesis: (nId: string, pId: string) => `patient:anamnesis:${nId}:${pId}`,
  patientGoals: (nId: string, pId: string) => `patient:goals:${nId}:${pId}`,
  patientTimeline: (nId: string, pId: string) => `patient:timeline:${nId}:${pId}`,

  // ─── Agenda ───────────────────────────────────────────────────
  agenda: (nId: string) => `agenda:${nId}`,
  appointments: (nId: string) => `appointments:${nId}`,

  // ─── Care sessions ────────────────────────────────────────────
  careSessions: (nId: string) => `care-sessions:${nId}`,
  careSession: (nId: string, csId: string) => `care-session:${nId}:${csId}`,

  // ─── Config / Team ────────────────────────────────────────────
  config: (nId: string) => `config:${nId}`,
  team: (nId: string) => `team:${nId}`,

  // ─── Portal (patient) ─────────────────────────────────────────
  portal: (pId: string) => `portal:${pId}`,
  portalMealPlan: (pId: string) => `portal:mealPlan:${pId}`,
  portalDiary: (pId: string) => `portal:diary:${pId}`,
  portalShopping: (pId: string) => `portal:shopping:${pId}`,
  portalCheckin: (pId: string) => `portal:checkin:${pId}`,
  portalChat: (pId: string) => `portal:chat:${pId}`,
  portalGoals: (pId: string) => `portal:goals:${pId}`,
  portalTasks: (pId: string) => `portal:tasks:${pId}`,
  portalEvolution: (pId: string) => `portal:evolution:${pId}`,
} as const;
