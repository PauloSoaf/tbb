/** Centralised route builders — single source of truth for all NutriOpus URLs */
export const routes = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: (tenant: string) => `/dashboard/${tenant}`,

  // ── Patients ─────────────────────────────────────────────────────────────
  patients:        (tenant: string)                               => `/dashboard/${tenant}/pacientes`,
  patientNew:      (tenant: string)                               => `/dashboard/${tenant}/pacientes/novo`,
  patient:         (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}`,
  patientEdit:     (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/editar`,
  patientAnamnese: (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/anamnese`,
  patientMedidas:  (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/medidas`,
  patientMedidaNova: (tenant: string, patientId: string)          => `/dashboard/${tenant}/pacientes/${patientId}/medidas/nova`,
  patientMedida:   (tenant: string, patientId: string, measurementId: string) =>
    `/dashboard/${tenant}/pacientes/${patientId}/medidas/${measurementId}`,
  patientPlanos:   (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/planos`,
  patientPlanoNovo: (tenant: string, patientId: string)           => `/dashboard/${tenant}/pacientes/${patientId}/planos/novo`,
  patientPlano:    (tenant: string, patientId: string, planId: string) =>
    `/dashboard/${tenant}/pacientes/${patientId}/planos/${planId}`,
  patientRelatorio: (tenant: string, patientId: string)           => `/dashboard/${tenant}/pacientes/${patientId}/relatorio`,
  patientArquivos: (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/arquivos`,
  patientDiario:   (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/diario`,
  patientCompras:  (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/compras`,
  patientChat:     (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/chat`,
  patientConsultas:(tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/consultas`,
  patientAdesao:   (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/adesao`,
  patientFicha:    (tenant: string, patientId: string)            => `/dashboard/${tenant}/pacientes/${patientId}/ficha`,
  patientAdipometro: (tenant: string, patientId: string)          => `/dashboard/${tenant}/pacientes/${patientId}/medidas/adipometro`,

  // ── Care Sessions ────────────────────────────────────────────────────────
  careSessions:    (tenant: string)                               => `/dashboard/${tenant}/atendimentos`,
  careSessionNew:  (tenant: string)                               => `/dashboard/${tenant}/atendimentos/novo`,
  careSession:     (tenant: string, sessionId: string)            => `/dashboard/${tenant}/atendimentos/${sessionId}`,

  // ── Agenda ───────────────────────────────────────────────────────────────
  agenda:          (tenant: string)                               => `/dashboard/${tenant}/agenda`,
  reminders:       (tenant: string)                               => `/dashboard/${tenant}/lembretes`,

  // ── Tools ────────────────────────────────────────────────────────────────
  ferramentas:     (tenant: string)                               => `/dashboard/${tenant}/ferramentas`,
  taco:            (tenant: string)                               => `/dashboard/${tenant}/ferramentas/taco`,
  oficina:         (tenant: string)                               => `/dashboard/${tenant}/ferramentas/oficina-planos`,
  oficinaStudio:   (tenant: string, mealPlanId: string)           => `/dashboard/${tenant}/ferramentas/oficina-planos/${mealPlanId}`,
  calculadoras:    (tenant: string)                               => `/dashboard/${tenant}/ferramentas/calculadoras`,
  relatorioclinica:(tenant: string)                               => `/dashboard/${tenant}/ferramentas/relatorio-clinica`,
  modelos:         (tenant: string)                               => `/dashboard/${tenant}/ferramentas/modelos`,
  bemEstar:        (tenant: string)                               => `/dashboard/${tenant}/ferramentas/bem-estar`,
  compararPacientes:(tenant: string)                              => `/dashboard/${tenant}/ferramentas/comparar-pacientes`,

  // ── Config / Equipe ──────────────────────────────────────────────────────
  config:          (tenant: string)                               => `/dashboard/${tenant}/config`,
  equipe:          (tenant: string)                               => `/dashboard/${tenant}/equipe`,

  // ── Portal ───────────────────────────────────────────────────────────────
  portalHome:      (tenant: string)                               => `/portal/${tenant}`,
  portalCardapio:  (tenant: string)                               => `/portal/${tenant}/cardapio`,
  portalEvolucao:  (tenant: string)                               => `/portal/${tenant}/evolucao`,
  portalDiario:    (tenant: string)                               => `/portal/${tenant}/diario`,
  portalAgenda:    (tenant: string)                               => `/portal/${tenant}/agenda`,
  portalCompras:   (tenant: string)                               => `/portal/${tenant}/compras`,
  portalMetas:     (tenant: string)                               => `/portal/${tenant}/metas`,
  portalArquivos:  (tenant: string)                               => `/portal/${tenant}/arquivos`,
  portalChat:      (tenant: string)                               => `/portal/${tenant}/chat`,
  portalAtendimentos:(tenant: string)                             => `/portal/${tenant}/atendimentos`,
  portalAtendimento:(tenant: string, sessionId: string)           => `/portal/${tenant}/atendimentos/${sessionId}`,
  portalCheckin:   (tenant: string)                               => `/portal/${tenant}/checkin`,
  portalTarefas:   (tenant: string)                               => `/portal/${tenant}/tarefas`,
  portalAnamnese:  (tenant: string)                               => `/portal/${tenant}/anamnese`,
  portalCalculadora:(tenant: string)                              => `/portal/${tenant}/calculadora`,
  portalPeso:      (tenant: string)                               => `/portal/${tenant}/peso`,
} as const;
