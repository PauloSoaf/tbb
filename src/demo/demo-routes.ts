// Central route map for Demo Mode — demo navigation must NEVER point at the
// real app routes (/dashboard/[tenant], /portal/[tenant]).

export const demoRoutes = {
  entry: "/demo",
  dashboard: "/demo/dashboard",
  patients: "/demo/dashboard/pacientes",
  patient: (id: string) => `/demo/dashboard/pacientes/${id}`,
  patientEvaluations: (id: string) => `/demo/dashboard/pacientes/${id}/avaliacoes`,
  patientPlans: (id: string) => `/demo/dashboard/pacientes/${id}/planos`,
  agenda: "/demo/dashboard/agenda",
  careSessions: "/demo/dashboard/atendimentos",
  tools: "/demo/dashboard/ferramentas",
  portal: "/demo/portal",
  portalMealPlan: "/demo/portal/cardapio",
  portalEvolution: "/demo/portal/evolucao",
  portalDiary: "/demo/portal/diario",
  portalShopping: "/demo/portal/compras",
  portalChat: "/demo/portal/chat",
  portalAgenda: "/demo/portal/agenda",
} as const;
