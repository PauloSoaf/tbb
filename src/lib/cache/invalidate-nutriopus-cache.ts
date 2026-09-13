import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "./cache-tags";

// expire: 0 = immediate expiry (read-your-own-writes).
// The next request will not serve a stale cached response.
const now = { expire: 0 } as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tag(t: string) {
  revalidateTag(t, now);
}

function path(p: string) {
  revalidatePath(p, "page");
}

// ─── Appointment mutations ────────────────────────────────────────────────────

export function invalidateAfterAppointmentMutation(args: {
  nutritionistId: string;
  tenant: string;
  patientId?: string;
}) {
  const { nutritionistId: nId, tenant, patientId } = args;

  tag(cacheTags.agenda(nId));
  tag(cacheTags.appointments(nId));
  tag(cacheTags.dashboardAppointments(nId));
  tag(cacheTags.dashboardStats(nId));
  tag(cacheTags.dashboardAction(nId));

  path(`/dashboard/${tenant}/agenda`);
  path(`/dashboard/${tenant}`);

  if (patientId) {
    tag(cacheTags.patient(nId, patientId));
    tag(cacheTags.patientTimeline(nId, patientId));
    path(`/dashboard/${tenant}/pacientes/${patientId}`);
  }
}

// ─── Patient mutations ────────────────────────────────────────────────────────

export function invalidateAfterCreatePatient(args: {
  nutritionistId: string;
  tenant: string;
}) {
  const { nutritionistId: nId, tenant } = args;

  tag(cacheTags.patients(nId));
  tag(cacheTags.dashboardStats(nId));
  tag(cacheTags.dashboardAction(nId));
  tag(cacheTags.dashboard(nId));

  path(`/dashboard/${tenant}/pacientes`);
  path(`/dashboard/${tenant}`);
}

export function invalidateAfterUpdatePatient(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
}) {
  const { nutritionistId: nId, tenant, patientId } = args;

  tag(cacheTags.patients(nId));
  tag(cacheTags.patient(nId, patientId));

  path(`/dashboard/${tenant}/pacientes`);
  path(`/dashboard/${tenant}/pacientes/${patientId}`);
}

export function invalidateAfterArchivePatient(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
}) {
  const { nutritionistId: nId, tenant, patientId } = args;

  tag(cacheTags.patients(nId));
  tag(cacheTags.patient(nId, patientId));
  tag(cacheTags.dashboardStats(nId));
  tag(cacheTags.dashboard(nId));

  path(`/dashboard/${tenant}/pacientes`);
  path(`/dashboard/${tenant}`);
}

// ─── Anamnese mutations ───────────────────────────────────────────────────────

export function invalidateAfterAnamnese(args: {
  nutritionistId: string;
  tenant: string;
  patientId?: string;
  responseId?: string;
}) {
  const { nutritionistId: nId, tenant, patientId, responseId } = args;

  tag(cacheTags.dashboardAnamneses(nId));
  tag(cacheTags.dashboardAttention(nId));
  tag(cacheTags.dashboardAction(nId));
  tag(cacheTags.dashboardStats(nId));

  path(`/dashboard/${tenant}`);

  if (patientId) {
    tag(cacheTags.patient(nId, patientId));
    tag(cacheTags.patientAnamnesis(nId, patientId));
    path(`/dashboard/${tenant}/pacientes/${patientId}`);
  }
  if (responseId) {
    path(`/dashboard/${tenant}/anamnese/${responseId}`);
  }
}

// ─── Meal plan mutations ──────────────────────────────────────────────────────

export function invalidateAfterMealPlanMutation(args: {
  nutritionistId: string;
  tenant: string;
  patientId?: string;
  portalPatientId?: string;
  mealPlanId?: string;
}) {
  const { nutritionistId: nId, tenant, patientId, portalPatientId, mealPlanId } = args;

  if (patientId) {
    tag(cacheTags.patient(nId, patientId));
    tag(cacheTags.patientMealPlans(nId, patientId));
    path(`/dashboard/${tenant}/pacientes/${patientId}`);
  }
  if (portalPatientId) {
    tag(cacheTags.portalMealPlan(portalPatientId));
    path(`/portal/${tenant}/cardapio`);
  }
  if (mealPlanId) {
    path(`/dashboard/${tenant}/ferramentas/oficina-planos/${mealPlanId}`);
  }

  tag(cacheTags.dashboardAction(nId));
  path(`/dashboard/${tenant}/ferramentas/oficina-planos`);
}

// ─── Patient detail mutations ─────────────────────────────────────────────────

export function invalidatePatientDetail(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
}) {
  const { nutritionistId: nId, tenant, patientId } = args;

  tag(cacheTags.patient(nId, patientId));
  path(`/dashboard/${tenant}/pacientes/${patientId}`);
}

export function invalidatePatientGoals(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
  portalPatientId?: string;
  portalTenant?: string;
}) {
  const { nutritionistId: nId, tenant, patientId, portalPatientId, portalTenant } = args;

  tag(cacheTags.patientGoals(nId, patientId));
  tag(cacheTags.patient(nId, patientId));
  path(`/dashboard/${tenant}/pacientes/${patientId}`);

  if (portalPatientId && portalTenant) {
    tag(cacheTags.portalGoals(portalPatientId));
    path(`/portal/${portalTenant}/metas`);
  }
}

export function invalidatePatientFiles(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
}) {
  const { nutritionistId: nId, tenant, patientId } = args;

  tag(cacheTags.patientFiles(nId, patientId));
  path(`/dashboard/${tenant}/pacientes/${patientId}/arquivos`);
}

// ─── Agenda ───────────────────────────────────────────────────────────────────

export function invalidateAgenda(args: { nutritionistId: string; tenant: string }) {
  const { nutritionistId: nId, tenant } = args;

  tag(cacheTags.agenda(nId));
  tag(cacheTags.appointments(nId));
  path(`/dashboard/${tenant}/agenda`);
}

// ─── Care sessions ────────────────────────────────────────────────────────────

export function invalidateAfterCareSessionMutation(args: {
  nutritionistId: string;
  tenant: string;
  patientId?: string;
  sessionId?: string;
}) {
  const { nutritionistId: nId, tenant, patientId, sessionId } = args;

  tag(cacheTags.careSessions(nId));
  tag(cacheTags.dashboardStats(nId));

  path(`/dashboard/${tenant}/atendimentos`);
  path(`/dashboard/${tenant}`);

  if (patientId) {
    tag(cacheTags.patient(nId, patientId));
    tag(cacheTags.patientTimeline(nId, patientId));
    path(`/dashboard/${tenant}/pacientes/${patientId}`);
  }
  if (sessionId) {
    tag(cacheTags.careSession(nId, sessionId));
    path(`/dashboard/${tenant}/atendimentos/${sessionId}`);
  }
}

// ─── Chat / messages ──────────────────────────────────────────────────────────

export function invalidateAfterChatMessage(args: {
  nutritionistId: string;
  tenant: string;
  patientId: string;
  portalPatientId?: string;
  portalTenant?: string;
}) {
  const { nutritionistId: nId, tenant, patientId, portalPatientId, portalTenant } = args;

  tag(cacheTags.dashboardMessages(nId));
  path(`/dashboard/${tenant}/pacientes/${patientId}/chat`);
  path(`/dashboard/${tenant}`);

  if (portalPatientId && portalTenant) {
    tag(cacheTags.portalChat(portalPatientId));
    path(`/portal/${portalTenant}/chat`);
  }
}

// ─── Portal mutations ─────────────────────────────────────────────────────────

export function invalidatePortalDiary(args: { patientId: string; tenant: string }) {
  tag(cacheTags.portalDiary(args.patientId));
  path(`/portal/${args.tenant}/diario`);
}

export function invalidatePortalShopping(args: { patientId: string; tenant: string }) {
  tag(cacheTags.portalShopping(args.patientId));
  path(`/portal/${args.tenant}/compras`);
}

export function invalidatePortalCheckin(args: {
  patientId: string;
  tenant: string;
  nutritionistId?: string;
}) {
  const { patientId, tenant, nutritionistId: nId } = args;

  tag(cacheTags.portalCheckin(patientId));
  path(`/portal/${tenant}/checkin`);

  if (nId) {
    tag(cacheTags.dashboardMood(nId));
    path(`/dashboard/${tenant}`);
  }
}

export function invalidatePortalEvolution(args: { patientId: string; tenant: string }) {
  tag(cacheTags.portalEvolution(args.patientId));
  path(`/portal/${args.tenant}/evolucao`);
  path(`/portal/${args.tenant}/peso`);
}

export function invalidatePortalTasks(args: { patientId: string; tenant: string }) {
  tag(cacheTags.portalTasks(args.patientId));
  path(`/portal/${args.tenant}/tarefas`);
}

// ─── Config / Team ────────────────────────────────────────────────────────────

export function invalidateConfig(args: { nutritionistId: string; tenant: string }) {
  tag(cacheTags.config(args.nutritionistId));
  path(`/dashboard/${args.tenant}/config`);
  path(`/${args.tenant}`);
}

export function invalidateTeam(args: { nutritionistId: string; tenant: string }) {
  tag(cacheTags.team(args.nutritionistId));
  path(`/dashboard/${args.tenant}/equipe`);
}

// ─── Dashboard (full invalidation) ───────────────────────────────────────────

export function invalidateDashboard(args: { nutritionistId: string; tenant: string }) {
  tag(cacheTags.dashboard(args.nutritionistId));
  tag(cacheTags.dashboardMessages(args.nutritionistId));
  path(`/dashboard/${args.tenant}`);
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function invalidateTemplates(args: { nutritionistId: string; tenant: string }) {
  tag(cacheTags.patients(args.nutritionistId));
  path(`/dashboard/${args.tenant}/ferramentas/modelos`);
  path(`/dashboard/${args.tenant}/ferramentas/oficina-planos`);
}
