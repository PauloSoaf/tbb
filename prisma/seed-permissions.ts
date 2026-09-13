import { PrismaClient, TeamMemberRole } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Patients
  { key: "patients.view", resource: "patients", action: "view", description: "Visualizar lista e cadastro de pacientes" },
  { key: "patients.create", resource: "patients", action: "create", description: "Cadastrar novos pacientes" },
  { key: "patients.edit", resource: "patients", action: "edit", description: "Editar dados cadastrais e antropométricos básicos do paciente" },
  { key: "patients.archive", resource: "patients", action: "archive", description: "Arquivar ou desativar pacientes" },
  { key: "patients.delete", resource: "patients", action: "delete", description: "Excluir permanentemente pacientes" },
  { key: "patients.export", resource: "patients", action: "export", description: "Exportar relatórios e listas de pacientes" },
  { key: "patients.viewSensitive", resource: "patients", action: "viewSensitive", description: "Visualizar dados sensíveis (notas ocultas, contatos de emergência)" },

  // Anamnesis
  { key: "anamnesis.view", resource: "anamnesis", action: "view", description: "Visualizar anamneses respondidas" },
  { key: "anamnesis.create", resource: "anamnesis", action: "create", description: "Criar ou enviar questionários de anamnese" },
  { key: "anamnesis.edit", resource: "anamnesis", action: "edit", description: "Editar ou corrigir anamneses" },
  { key: "anamnesis.delete", resource: "anamnesis", action: "delete", description: "Excluir anamneses" },
  { key: "anamnesis.resend", resource: "anamnesis", action: "resend", description: "Re-enviar link de anamnese para o paciente" },
  { key: "anamnesis.viewSensitive", resource: "anamnesis", action: "viewSensitive", description: "Visualizar respostas clínicas sensíveis na anamnese" },

  // Anthropometry
  { key: "anthropometry.view", resource: "anthropometry", action: "view", description: "Visualizar avaliações antropométricas e gráficos" },
  { key: "anthropometry.create", resource: "anthropometry", action: "create", description: "Registrar novas medidas e adipômetro" },
  { key: "anthropometry.edit", resource: "anthropometry", action: "edit", description: "Editar avaliações antropométricas salvas" },
  { key: "anthropometry.delete", resource: "anthropometry", action: "delete", description: "Excluir medições e avaliações" },
  { key: "anthropometry.viewSensitive", resource: "anthropometry", action: "viewSensitive", description: "Visualizar fotos clínicas e estimativas corporais detalhadas" },

  // Medical Records (Prontuário)
  { key: "medicalRecords.view", resource: "medicalRecords", action: "view", description: "Visualizar evolução e histórico no Prontuário 360°" },
  { key: "medicalRecords.create", resource: "medicalRecords", action: "create", description: "Adicionar notas de evolução e atendimentos no prontuário" },
  { key: "medicalRecords.edit", resource: "medicalRecords", action: "edit", description: "Editar entradas no prontuário" },
  { key: "medicalRecords.delete", resource: "medicalRecords", action: "delete", description: "Excluir notas do prontuário clínico" },
  { key: "medicalRecords.viewSensitive", resource: "medicalRecords", action: "viewSensitive", description: "Visualizar anotações sigilosas e transcrições de consultas" },

  // Appointments (Agenda/Atendimentos)
  { key: "appointments.view", resource: "appointments", action: "view", description: "Visualizar agenda e horários de atendimentos" },
  { key: "appointments.create", resource: "appointments", action: "create", description: "Agendar novos atendimentos" },
  { key: "appointments.edit", resource: "appointments", action: "edit", description: "Remarcar ou alterar atendimentos" },
  { key: "appointments.cancel", resource: "appointments", action: "cancel", description: "Cancelar atendimentos" },
  { key: "appointments.joinOnline", resource: "appointments", action: "joinOnline", description: "Entrar na sala de consulta online por videochamada" },

  // Meal Plans (Planos Alimentares)
  { key: "mealPlans.view", resource: "mealPlans", action: "view", description: "Visualizar planos alimentares prescritos" },
  { key: "mealPlans.create", resource: "mealPlans", action: "create", description: "Criar e prescrever novos planos na Oficina" },
  { key: "mealPlans.edit", resource: "mealPlans", action: "edit", description: "Editar planos alimentares e substituições" },
  { key: "mealPlans.delete", resource: "mealPlans", action: "delete", description: "Excluir planos alimentares" },
  { key: "mealPlans.generatePdf", resource: "mealPlans", action: "generatePdf", description: "Gerar PDF do plano alimentar" },
  { key: "mealPlans.sendToPatient", resource: "mealPlans", action: "sendToPatient", description: "Disponibilizar plano no portal ou enviar ao paciente" },

  // Dashboard
  { key: "dashboard.view", resource: "dashboard", action: "view", description: "Acessar o painel principal e métricas de atendimento" },
  { key: "dashboard.viewFinancial", resource: "dashboard", action: "viewFinancial", description: "Visualizar métricas financeiras e faturamento" },
  { key: "dashboard.viewTeamMetrics", resource: "dashboard", action: "viewTeamMetrics", description: "Acompanhar produtividade e métricas da equipe" },

  // Team
  { key: "team.view", resource: "team", action: "view", description: "Visualizar membros da equipe e funções" },
  { key: "team.invite", resource: "team", action: "invite", description: "Convidar novos membros para a equipe" },
  { key: "team.editPermissions", resource: "team", action: "editPermissions", description: "Editar papéis e permissões granulares dos membros" },
  { key: "team.disableMember", resource: "team", action: "disableMember", description: "Ativar ou desativar membros da equipe" },
  { key: "team.removeMember", resource: "team", action: "removeMember", description: "Remover membros da clínica" },

  // Settings
  { key: "settings.view", resource: "settings", action: "view", description: "Visualizar configurações gerais da clínica" },
  { key: "settings.editClinic", resource: "settings", action: "editClinic", description: "Editar dados de perfil, endereço e especialidades da clínica" },
  { key: "settings.editPrivacy", resource: "settings", action: "editPrivacy", description: "Editar termos de privacidade e consentimento da clínica" },
  { key: "settings.editBilling", resource: "settings", action: "editBilling", description: "Gerenciar assinatura e dados bancários do SaaS" },

  // Audit Logs
  { key: "auditLogs.view", resource: "auditLogs", action: "view", description: "Visualizar logs de auditoria e timeline de segurança do tenant" },
  { key: "auditLogs.export", resource: "auditLogs", action: "export", description: "Exportar logs de auditoria do tenant" },
  { key: "auditLogs.viewSensitiveMetadata", resource: "auditLogs", action: "viewSensitiveMetadata", description: "Visualizar detalhes técnicos em eventos de auditoria" },

  // Sessions
  { key: "sessions.viewOwn", resource: "sessions", action: "viewOwn", description: "Visualizar próprias sessões ativas logadas na plataforma" },
  { key: "sessions.viewTeam", resource: "sessions", action: "viewTeam", description: "Visualizar sessões ativas de toda a equipe do tenant" },
  { key: "sessions.revokeOwn", resource: "sessions", action: "revokeOwn", description: "Revogar/desconectar dispositivos das próprias sessões logadas" },
  { key: "sessions.revokeTeam", resource: "sessions", action: "revokeTeam", description: "Revogar/desconectar remotamente sessões de membros da equipe" },

  // Security Events & Alerts
  { key: "securityEvents.view", resource: "securityEvents", action: "view", description: "Visualizar alertas de segurança e tentativas suspeitas na clínica" },

  // LGPD
  { key: "lgpd.view", resource: "lgpd", action: "view", description: "Visualizar solicitações de privacidade e status de consentimento" },
  { key: "lgpd.manageConsent", resource: "lgpd", action: "manageConsent", description: "Registrar ou revogar consentimento de pacientes" },
  { key: "lgpd.exportData", resource: "lgpd", action: "exportData", description: "Atender requisições de portabilidade/exportação de dados" },
  { key: "lgpd.deleteDataRequest", resource: "lgpd", action: "deleteDataRequest", description: "Gerenciar e executar solicitações de esquecimento/exclusão" },
  { key: "lgpd.privacySettings", resource: "lgpd", action: "privacySettings", description: "Configurar parâmetros de retenção e conformidade LGPD" },

  // Realtime transcription
  { key: "transcription.view", resource: "transcription", action: "view", description: "Visualizar transcrições dos atendimentos" },
  { key: "transcription.start", resource: "transcription", action: "start", description: "Iniciar transcrição automática" },
  { key: "transcription.pause", resource: "transcription", action: "pause", description: "Pausar transcrição em andamento" },
  { key: "transcription.resume", resource: "transcription", action: "resume", description: "Retomar transcrição pausada" },
  { key: "transcription.stop", resource: "transcription", action: "stop", description: "Parar transcrição em andamento" },
  { key: "transcription.save", resource: "transcription", action: "save", description: "Salvar transcrição final" },
  { key: "transcription.discard", resource: "transcription", action: "discard", description: "Descartar transcrição do atendimento" },
  { key: "transcription.delete", resource: "transcription", action: "delete", description: "Excluir transcrição salva" },
  { key: "transcription.export", resource: "transcription", action: "export", description: "Exportar conteúdo de transcrição" },
  { key: "transcription.attachToMedicalRecord", resource: "transcription", action: "attachToMedicalRecord", description: "Anexar transcrição revisada ao prontuário" },
  { key: "transcription.settings.view", resource: "transcription.settings", action: "view", description: "Visualizar configurações de transcrição" },
  { key: "transcription.settings.edit", resource: "transcription.settings", action: "edit", description: "Editar configurações de transcrição" },
  { key: "transcription.provider.test", resource: "transcription.provider", action: "test", description: "Testar conectividade do provider de transcrição" },
  { key: "transcription.usage.view", resource: "transcription.usage", action: "view", description: "Visualizar métricas agregadas de transcrição" },
];

const NUTRITIONIST_TRANSCRIPTION_PERMISSIONS = new Set([
  "transcription.view",
  "transcription.start",
  "transcription.pause",
  "transcription.resume",
  "transcription.stop",
  "transcription.save",
  "transcription.discard",
  "transcription.attachToMedicalRecord",
]);

const DEFAULT_ROLE_PERMISSIONS: Record<TeamMemberRole, string[]> = {
  OWNER: PERMISSIONS.map((p) => p.key),
  NUTRITIONIST: PERMISSIONS.filter(
    (p) =>
      !p.key.startsWith("settings.editBilling") &&
      !p.key.startsWith("team.editPermissions") &&
      (!p.key.startsWith("transcription.") ||
        NUTRITIONIST_TRANSCRIPTION_PERMISSIONS.has(p.key))
  ).map((p) => p.key),
  ASSISTANT: [
    "patients.view", "patients.create", "patients.edit",
    "appointments.view", "appointments.create", "appointments.edit", "appointments.cancel",
    "dashboard.view",
    "settings.view",
    "lgpd.view",
    "sessions.viewOwn", "sessions.revokeOwn",
  ],
  SECRETARY: [
    "patients.view", "patients.create",
    "appointments.view", "appointments.create", "appointments.edit", "appointments.cancel",
    "dashboard.view",
    "sessions.viewOwn", "sessions.revokeOwn",
  ],
  VIEWER: [
    "patients.view",
    "anamnesis.view",
    "anthropometry.view",
    "appointments.view",
    "mealPlans.view",
    "dashboard.view",
    "sessions.viewOwn", "sessions.revokeOwn",
  ],
  ADMIN: PERMISSIONS.filter((p) => !p.key.startsWith("settings.editBilling")).map((p) => p.key),
  EDITOR: [
    "patients.view",
    "anthropometry.view",
    "mealPlans.view", "mealPlans.create", "mealPlans.edit",
    "dashboard.view",
    "sessions.viewOwn", "sessions.revokeOwn",
  ],
  CUSTOM: ["dashboard.view", "sessions.viewOwn", "sessions.revokeOwn"],
};

async function main() {
  console.log("Seeding permissions catalog...");

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
      create: {
        key: perm.key,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map<string, string>();
  allPermissions.forEach((p) => permMap.set(p.key, p.id));

  console.log("Seeding default role permissions (tenantId: null)...");

  for (const [roleName, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roleEnum = roleName as TeamMemberRole;
    for (const key of keys) {
      const permId = permMap.get(key);
      if (!permId) continue;

      await prisma.$transaction(async (tx) => {
        const existing = await tx.rolePermission.findFirst({
          where: { tenantId: null, role: roleEnum, permissionId: permId },
        });
        if (!existing) {
          await tx.rolePermission.create({
            data: { tenantId: null, role: roleEnum, permissionId: permId, enabled: true },
          });
        }
      });
    }
  }

  // Set configurable GLOBAL_ADMIN if present
  const adminEmail = process.env.GLOBAL_ADMIN_EMAIL ?? "pauloamorim70144@gmail.com";
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (user) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "GLOBAL_ADMIN" },
    });
    console.log(`User ${adminEmail} updated to GLOBAL_ADMIN.`);
  } else {
    console.log(`User ${adminEmail} not found yet in database. When registered, they should be set to GLOBAL_ADMIN.`);
  }

  // Seed default SubscriptionPlans
  console.log("Seeding default Subscription Plans...");
  const PLANS = [
    { code: "FREE", name: "NutriOpus Gratuito (Acadêmico)", description: "Plano inicial com recursos básicos para estudantes", priceCents: 0, maxPatients: 5, maxTeamMembers: 1 },
    { code: "BASIC", name: "NutriOpus Starter", description: "Ideal para nutricionistas em início de clínica privada", priceCents: 9700, maxPatients: 30, maxTeamMembers: 1 },
    { code: "PRO", name: "NutriOpus Profissional", description: "Para consultórios consolidados com alto volume de atendimentos", priceCents: 19700, maxPatients: 150, maxTeamMembers: 3 },
    { code: "CLINIC", name: "NutriOpus Clínica & Equipe", description: "Gestão multi-colaborador avançada com auditoria e RBAC total", priceCents: 39700, maxPatients: 9999, maxTeamMembers: 15 },
  ];

  const planIdByCode = new Map<string, string>();
  for (const plan of PLANS) {
    const record = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, description: plan.description, priceCents: plan.priceCents, maxPatients: plan.maxPatients, maxTeamMembers: plan.maxTeamMembers },
      create: { code: plan.code, name: plan.name, description: plan.description, priceCents: plan.priceCents, maxPatients: plan.maxPatients, maxTeamMembers: plan.maxTeamMembers },
    });
    planIdByCode.set(plan.code, record.id);
  }
  console.log("Subscription plans seeded successfully.");

  // Seed default FeatureLimit rows per plan (Sprint 7 — Assinaturas, Planos e Limites).
  // `patients.max`/`team.max` mirror SubscriptionPlan.maxPatients/maxTeamMembers so
  // requireFeature()/checkUsageLimit() have a single, generic key-based source of truth.
  console.log("Seeding default Feature Limits...");
  const FEATURE_LIMITS: Record<string, { key: string; limit: number | null; enabled: boolean }[]> = {
    FREE: [
      { key: "patients.max", limit: 5, enabled: true },
      { key: "team.max", limit: 1, enabled: true },
      { key: "mealPlanPdf.monthly", limit: 10, enabled: true },
      { key: "auditTrail.enabled", limit: null, enabled: false },
      { key: "rbacOverrides.enabled", limit: null, enabled: false },
      { key: "storage.maxMb", limit: 200, enabled: true },
      { key: "storage.singleUpload.maxMb", limit: 5, enabled: true },
      { key: "storage.transcription-audio.maxMb", limit: 80, enabled: true },
      { key: "transcription.online.enabled", limit: null, enabled: true },
      { key: "transcription.inPerson.enabled", limit: null, enabled: true },
      { key: "transcription.minutes.monthly", limit: 60, enabled: true },
      { key: "transcription.history.enabled", limit: null, enabled: true },
      { key: "transcription.export.enabled", limit: null, enabled: false },
      { key: "transcription.attach.enabled", limit: null, enabled: true },
    ],
    BASIC: [
      { key: "patients.max", limit: 30, enabled: true },
      { key: "team.max", limit: 1, enabled: true },
      { key: "mealPlanPdf.monthly", limit: 60, enabled: true },
      { key: "auditTrail.enabled", limit: null, enabled: false },
      { key: "rbacOverrides.enabled", limit: null, enabled: false },
      { key: "storage.maxMb", limit: 1000, enabled: true },
      { key: "storage.singleUpload.maxMb", limit: 10, enabled: true },
      { key: "storage.transcription-audio.maxMb", limit: 400, enabled: true },
      { key: "transcription.online.enabled", limit: null, enabled: true },
      { key: "transcription.inPerson.enabled", limit: null, enabled: true },
      { key: "transcription.minutes.monthly", limit: 300, enabled: true },
      { key: "transcription.history.enabled", limit: null, enabled: true },
      { key: "transcription.export.enabled", limit: null, enabled: true },
      { key: "transcription.attach.enabled", limit: null, enabled: true },
    ],
    PRO: [
      { key: "patients.max", limit: 150, enabled: true },
      { key: "team.max", limit: 3, enabled: true },
      { key: "mealPlanPdf.monthly", limit: null, enabled: true },
      { key: "auditTrail.enabled", limit: null, enabled: true },
      { key: "rbacOverrides.enabled", limit: null, enabled: true },
      { key: "storage.maxMb", limit: 5000, enabled: true },
      { key: "storage.singleUpload.maxMb", limit: 25, enabled: true },
      { key: "transcription.online.enabled", limit: null, enabled: true },
      { key: "transcription.inPerson.enabled", limit: null, enabled: true },
      { key: "transcription.minutes.monthly", limit: 1500, enabled: true },
      { key: "transcription.history.enabled", limit: null, enabled: true },
      { key: "transcription.export.enabled", limit: null, enabled: true },
      { key: "transcription.attach.enabled", limit: null, enabled: true },
    ],
    CLINIC: [
      { key: "patients.max", limit: 9999, enabled: true },
      { key: "team.max", limit: 15, enabled: true },
      { key: "mealPlanPdf.monthly", limit: null, enabled: true },
      { key: "auditTrail.enabled", limit: null, enabled: true },
      { key: "rbacOverrides.enabled", limit: null, enabled: true },
      { key: "storage.maxMb", limit: 20000, enabled: true },
      { key: "storage.singleUpload.maxMb", limit: 100, enabled: true },
      { key: "transcription.online.enabled", limit: null, enabled: true },
      { key: "transcription.inPerson.enabled", limit: null, enabled: true },
      { key: "transcription.minutes.monthly", limit: 5000, enabled: true },
      { key: "transcription.history.enabled", limit: null, enabled: true },
      { key: "transcription.export.enabled", limit: null, enabled: true },
      { key: "transcription.attach.enabled", limit: null, enabled: true },
    ],
  };

  for (const [code, limits] of Object.entries(FEATURE_LIMITS)) {
    const planId = planIdByCode.get(code);
    if (!planId) continue;
    for (const fl of limits) {
      await prisma.featureLimit.upsert({
        where: { planId_key: { planId, key: fl.key } },
        update: { limit: fl.limit, enabled: fl.enabled },
        create: { planId, key: fl.key, limit: fl.limit, enabled: fl.enabled },
      });
    }
  }
  console.log("Feature limits seeded successfully.");

  console.log("Seed permissions finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
