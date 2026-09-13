# Governança, RBAC, Segurança Ativa, Auditoria & Conformidade LGPD (NutriOpus)

Este documento descreve a arquitetura avançada de segurança, governança multi-tenant, auditoria sanitizada e controle ativo de sessões implementados no **NutriOpus**, cobrindo as **Fases 1, 2 e 3**.

---

## 🏗️ Resumo Geral da Estrutura

### 1. Fases 1 & 2 — Fundação de Governança, RBAC e Gestão de Equipe
- **Modelagem (`Prisma`)**:
  - `Permission`: Catálogo central com 43 permissões atômicas categorizadas por recurso (`resource`) e ação (`action`).
  - `RolePermission`: Mapeamento padrão de permissões por cargo (`OWNER`, `ADMIN`, `NUTRITIONIST`, `ASSISTANT`, `SECRETARY`, `EDITOR`, `VIEWER`, `CUSTOM`).
  - `MemberPermissionOverride`: Controle 3-Way (`INHERIT`, `ALLOW`, `DENY`) por colaborador e tenant.
  - `AuditLog`: Trilha imutável de eventos sensíveis (com índices otimizados por `tenantId`, `actorUserId`, `patientId`, `action`, `result`, `createdAt`).
  - `UserSession`: Controle de sessões de usuário (`sessionTokenHash`, `status`, `expiresAt`, `lastSeenAt`, `ipHash`, `userAgent`).
  - `ConsentRecord`, `DataSubjectRequest` e `SecurityEvent`: Suporte a conformidade LGPD e alertas de anomalias.
- **Isolamento de Tenant**:
  - `requireTenantAccess` e `assertTenantOwnership` evitam vazamentos e cross-tenant data access.
- **RBAC no Servidor & Cliente**:
  - `permissionService.getMemberPermissions`: Calcula em tempo de requisição a permissão efetiva combinando o cargo do membro com suas exceções granulares.
  - `PermissionsContext.tsx` & `<Can>`: Provider e componente condicional para proteger a interface de acordo com o contexto reativo no lado do cliente.

---

## 🛡️ Fase 3 — Auditoria e Segurança Ativa

A **Fase 3** constrói a camada visual, operacional e enforcement em tempo real de segurança e auditoria para a clínica. A dona ou administrador pode visualizar quem acessou, editou, arquivou, deletou ou tentou acessar dados sem permissão, monitorar dispositivos conectados e revogar remotamente sessões ativas.

### 1. Nomenclatura Padronizada de Eventos de Auditoria (`AuditLog.action`)
Todos os eventos gravados no sistema foram padronizados na notação `recurso.acao` (com pontos):
- `patient.create`, `patient.update`, `patient.archive`, `patient.delete`
- `anamnesis.create`, `anamnesis.update`, `anamnesis.delete`, `anamnesis.submit.public`
- `anthropometry.create`, `anthropometry.update`
- `medicalRecord.note.create`, `medicalRecord.note.update`, `medicalRecord.note.delete`
- `team.invite.create`, `team.invite.revoke`, `team.role.update`, `team.member.remove`, `team.permissions.update`
- `session.login`, `session.login.failed`, `session.revoke`
- `permission.denied` (disparado automaticamente por `requirePermission` em tentativas de acesso negado a recursos ou violação de tenant).

### 2. Revogação Real de Sessões na Autenticação
A revogação não é apenas visual:
- Em `cookies.ts` (`getSessionFromCookies`), todo token JWT lido dos cookies é verificado via hash (`sha256`) na tabela `user_sessions`.
- Se o status no banco for `REVOKED` ou `EXPIRED` (ou `expiresAt < now`), a autenticação é abortada e a requisição rejeitada (`null`).
- O campo `lastSeenAt` é atualizado no banco de forma otimizada (*throttled* no máximo uma vez a cada 5 minutos por sessão ativa para evitar sobrecarga de escrita).

### 3. Rotas, Serviços e Componentes Criados (Fase 3)
- **Serviços (`src/services/`)**:
  - `audit-log.query.service.ts`: Consulta paginada no servidor, filtros por ator, paciente, módulo, resultado (`SUCCESS`, `FAILURE`, `DENIED`), período e busca textual. Exclui estritamente metadados contendo PII e conteúdos clínicos sensíveis.
  - `session.service.ts`: Listagem de sessões próprias e da equipe, encerramento/revogação remota com registro de auditoria (`session.revoke`).
  - `security-event.service.ts`: Listagem, reconhecimento (`acknowledge`) e resolução (`resolve`) de alertas de segurança.
- **Server Actions (`src/actions/security.action.ts`)**:
  - `getAuditLogsAction`, `getSessionsAction`, `revokeSessionAction`, `getSecurityEventsAction`, `acknowledgeSecurityEventAction`, `resolveSecurityEventAction`.
- **Componentes (`src/components/security/`)**:
  - `SecurityAndAuditClient.tsx`: Aba reativa principal (`Trilha de Auditoria`, `Sessões Ativas`, `Alertas de Segurança`).
  - `AuditTimelineTab.tsx`: Tabela/Timeline com busca, filtros combinados, paginação server-side e botão de exportação CSV (exigindo `auditLogs.export`).
  - `AuditEventDrawer.tsx`: Drawer lateral de detalhes do evento sanitizado (exibe ator, cargo, alvo, data, IP mascarado, campos alterados em nomes, motivo de rejeição, sem exibir respostas clínicas ou textos de prontuário).
  - `SessionsTab.tsx`: Cards de dispositivos conectados, destaque de sessão atual e botão de revogação imediata com toast de confirmação.
  - `SecurityAlertsTab.tsx`: Listagem por severidade e status dos incidentes de segurança.
- **Página de Segurança**:
  - `/dashboard/[tenant]/configuracoes/seguranca` (`src/app/dashboard/[tenant]/configuracoes/seguranca/page.tsx`).

### 4. Permissões Catalogadas na Fase 3
| Chave (`key`) | Recurso (`resource`) | Ação (`action`) | Descrição |
| :--- | :--- | :--- | :--- |
| `auditLogs.view` | `auditLogs` | `view` | Visualizar logs de auditoria e timeline de segurança do tenant |
| `auditLogs.export` | `auditLogs` | `export` | Exportar logs de auditoria para CSV |
| `auditLogs.viewSensitiveMetadata` | `auditLogs` | `viewSensitiveMetadata` | Visualizar detalhes técnicos em eventos de auditoria |
| `sessions.viewOwn` | `sessions` | `viewOwn` | Visualizar próprias sessões logadas |
| `sessions.viewTeam` | `sessions` | `viewTeam` | Visualizar sessões de toda a equipe do tenant |
| `sessions.revokeOwn` | `sessions` | `revokeOwn` | Revogar/desconectar dispositivos próprios |
| `sessions.revokeTeam` | `sessions` | `revokeTeam` | Revogar remotamente sessões de outros membros da equipe |
| `securityEvents.view` | `securityEvents` | `view` | Visualizar alertas de segurança e tentativas suspeitas |

---

## 🧪 Como Testar e Validar

### 1. Auditoria e Proteção de PII
1. Acesse com o Owner o menu **Configurações > Governança & Segurança Ativa** (`/dashboard/[tenant]/configuracoes/seguranca`).
2. Realize alterações de teste em outro terminal ou tela (ex: edite um paciente, altere permissão de uma secretária ou tente acessar uma URL sem permissão).
3. Verifique a aba **Trilha de Auditoria**: os eventos aparecem com selos de Sucesso, Falha ou Acesso Negado (`permission.denied`).
4. Clique em um evento para abrir o **AuditEventDrawer**: comprove que os nomes dos campos alterados são mostrados, mas valores clínicos (ex: peso antigo/novo, texto da nota médica) são estritamente preservados/ocultados.

### 2. Revogação Remota de Sessões
1. Acesse a aba **Sessões Ativas**.
2. Identifique uma sessão de outro dispositivo ou de uma secretária/membro da equipe.
3. Clique em **Revogar Acesso**.
4. Verifique que o status da sessão muda para `REVOKED`.
5. Se o dispositivo revogado tentar recarregar qualquer página no sistema ou disparar uma Server Action, será redirecionado/rejeitado instantaneamente pois `getSessionFromCookies()` checa o status no banco em cada requisição do servidor.

---

## 🚀 Limitações Atuais e Próximos Passos (Fase 4 & 5)
- **Fase 4 (LGPD & Consentimentos)**: Interface dedicada para o paciente e para a clínica gerenciarem registros imutáveis de consentimento (`ConsentRecord`), portabilidade em formato estruturado (`DataSubjectRequest` tipo `EXPORT`) e fluxos audituados de direito ao esquecimento/exclusão.
- **Fase 5 (Dashboard Administrativo Global)**: Painel de super-administração (`GLOBAL_ADMIN`) configurável por env (`GLOBAL_ADMIN_EMAIL`), com métricas consolidadas de uso de storage, crescimento de tenants, taxa de conversão e observabilidade global sem violar o isolamento de dados clínicos das nutricionistas.
