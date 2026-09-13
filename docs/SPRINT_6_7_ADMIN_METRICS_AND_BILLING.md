# Sprint 6 (métricas avançadas) + Sprint 7 (Assinaturas, Planos e Limites)

Data: 2026-07-19

## Sprint 6 — Métricas avançadas do Admin Global

`globalAdminService.getGlobalMetrics()` (`src/services/global-admin.service.ts`)
ganhou 5 campos novos, todos cross-tenant e agregados (nenhum dado clínico
individual):

- `activeSessions` — `UserSession` com `status = ACTIVE`.
- `loginsLast7Days` — `AuditLog` com `action = "session.login"` nos últimos 7 dias.
- `deniedAccessLast30Days` — `AuditLog` com `result = "DENIED"` nos últimos 30 dias.
- `sensitiveActionsLast30Days` — `AuditLog` cuja ação contém `delete`/`archive`,
  ou é `session.revoke`/`team.editPermissions`, nos últimos 30 dias.
- `openSecurityEvents` — `SecurityEvent` com `status = "OPEN"`.

Renderizado em `/admin` (`src/app/admin/page.tsx`) numa nova seção "Sessões &
Segurança (Cross-Tenant)" com 4 cards, seguindo o mesmo padrão visual dos
cards de KPI existentes.

## Sprint 7 — Assinaturas, Planos e Limites

### Banco de dados

- `BillingStatus` (enum novo): `TRIAL | ACTIVE | PAST_DUE | CANCELED`.
  `TenantSubscription.status` migrado de `String` livre para este enum
  (migration converte os valores existentes com `USING status::"BillingStatus"`).
- `FeatureLimit` (model novo): limite/flag por plano, chave livre
  (`patients.max`, `team.max`, `mealPlanPdf.monthly`, `auditTrail.enabled`,
  `rbacOverrides.enabled`). `limit = null` → ilimitado.
- `UsageCounter` (model novo): contador rolante por tenant+chave+janela
  (mês corrente), usado para limites de "quantidade por período" como PDFs/mês.
- Migration: `prisma/migrations/20260719000000_add_billing_limits/migration.sql`
  (escrita manualmente — não havia banco local rodando nesta sessão para
  `prisma migrate dev` gerar o diff; SQL segue exatamente o padrão que o
  Prisma já gera nas migrations anteriores do projeto).
- `prisma/seed-permissions.ts` agora também semeia `FeatureLimit` por plano
  (FREE/BASIC/PRO/CLINIC), espelhando `maxPatients`/`maxTeamMembers` do
  catálogo existente e adicionando os 3 recursos novos.

### Helpers e services (ESP-7-06 a ESP-7-10)

- `src/lib/billing/subscription-context.ts` — `getTenantSubscriptionContext(tenantId)`
  (plano + status + mapa de feature limits) e `requireFeature(tenantId, key)`
  (lança `FeatureNotAvailableError` se o recurso não estiver habilitado no plano).
- `src/services/billingPlan.service.ts` — leitura do catálogo de planos e dos
  limites de um plano específico.
- `src/services/usageLimit.service.ts` — `checkUsageLimit`/`incrementUsage`
  (contadores rolantes mensais) e `checkEntityLimit` (limites por contagem
  direta de linhas existentes, usado para pacientes/equipe).

### Limites aplicados de verdade (ESP-7-11 a ESP-7-14)

| Recurso | Onde | O que acontece ao atingir o limite |
|---|---|---|
| `patients.max` | `src/actions/createPatient.action.ts` | Cadastro de paciente é bloqueado com mensagem pedindo upgrade, antes de tocar no banco |
| `team.max` | `src/actions/team.action.ts` (`inviteTeamMemberAction`) | Convite de novo membro é bloqueado antes de criar o invite/enviar e-mail |
| `mealPlanPdf.monthly` | `src/actions/billing.action.ts` (`consumeMealPlanPdfQuotaAction`), chamado por `PdfPreviewControls.handleDownload` | Download do PDF é interrompido com toast de erro; contador só incrementa se a geração for permitida |
| `rbacOverrides.enabled` | `src/actions/permission.action.ts` (`updateMemberPermissionsAction`) | Salvar overrides ALLOW/DENY por membro é bloqueado em planos sem o recurso (FREE/BASIC), mesmo para o `OWNER` — este é um gate de **plano**, não de RBAC, então não é ignorado por `isOwner`/`isGlobalAdmin` como `requirePermission` seria |

`auditTrail.enabled` foi semeado no catálogo (`false` em FREE/BASIC, `true`
em PRO/CLINIC) mas **não** foi conectado a nenhuma tela ainda — ver
pendências abaixo.

### O que ficou de fora desta sprint

- **UI de "meu plano atual" / avisos de limite próximo** (RQ-7-12, US-7-05,
  FT-7-14) para o lado da nutricionista — hoje ela só descobre o limite
  quando tenta ultrapassá-lo e recebe o erro. Uma tela/():card mostrando
  "42/150 pacientes" e um aviso a partir de 80% não foi implementada.
- **CRUD de planos no Admin Global** (FT-7-02/03 — criar/editar/ativar planos
  pela UI). Hoje o catálogo só é editável via seed/banco; `/admin/planos`
  continua somente leitura.
- **`auditTrail.enabled`** não gate nenhuma tela ainda (a Trilha de Auditoria
  do tenant, se existir como tela própria, continua acessível independente
  do plano).
- **Integração real com gateway de pagamento** (Stripe/Mercado Pago) — fora
  do escopo desta sprint por design do próprio roadmap ("não é obrigatório
  integrar nesta sprint").
- Nenhum teste automatizado novo foi escrito para os helpers de billing —
  validação foi por `tsc`+`eslint`+`vitest` (691/691, sem regressão) +
  `npm run build` completo, mas sem cobertura unitária dedicada para
  `checkUsageLimit`/`checkEntityLimit`/`requireFeature`.

## Comandos executados e resultado

```bash
npx prisma generate      # OK (precisou parar o `next dev` local — travava o .dll no Windows)
npx tsc --noEmit          # 0 erros
npx eslint <arquivos tocados>   # 0 erros, 1 warning pré-existente não relacionado
npx vitest run             # 691/691 testes passando
npm run build               # ✓ Compiled successfully
```

## Ação necessária antes de aplicar em produção

A migration `20260719000000_add_billing_limits` **não foi aplicada** a
nenhum banco (não havia Postgres local rodando nesta sessão). Rodar
`npx prisma migrate deploy` (produção) ou `npx prisma migrate dev` (local,
com o Postgres do `docker-compose.yml` no ar) antes do próximo deploy, e
depois `npx tsx prisma/seed-permissions.ts` para popular os `FeatureLimit`
dos planos já existentes.
