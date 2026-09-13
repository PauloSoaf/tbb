# Sprint 5.1 — Hardening de Segurança e Validação Real

Data: 2026-07-19

## Método

Este ambiente não tem acesso a um navegador para conduzir os testes manuais
descritos no roadmap (login com múltiplas contas, inspecionar Network/DevTools
etc.). A validação abaixo foi feita por **auditoria estática de código**,
seguindo o caminho real de execução de cada garantia de segurança (que arquivo
chama qual função, em que ordem, o que acontece em cada branch), não por
suposição. Onde a auditoria encontrou um gap real, o gap foi corrigido nesta
mesma sessão (não só documentado).

## RQ-5.1-01 / 02 — Isolamento multi-tenant

**Status: confirmado.** Todas as queries de dados sensíveis (`patient`,
`anamneseResponse`, `patientMeasurement`, `appointment`, `mealPlan`, notas do
prontuário) passam por `nutritionistId: ctx.nutritionistId` (ou equivalente
`session.nutritionistId`), obtido de `getCurrentTenantContext`/
`getSessionFromCookies` — nunca de um parâmetro vindo do cliente sem
validação. `getCurrentTenantContext` (`src/lib/tenancy/getCurrentTenantContext.ts`)
recusa (`return null`) qualquer slug de tenant que não bata com
`session.nutritionistSlug`, exceto para `GLOBAL_ADMIN`.

## RQ-5.1-03 — Server Actions bloqueadas sem permissão

**Status: gap real encontrado e corrigido.** `grep` em todos os arquivos de
`src/actions/*.ts` por chamadas a `requirePermission`/`requireAuth`/
`assertTenantAccess` encontrou 4 arquivos que faziam apenas checagem de
tenant (`session.nutritionistSlug === tenantSlug`) sem checar a permissão
granular do catálogo (`src/lib/tenancy/requirePermission.ts`):

| Arquivo | Ação | Permissão que faltava | Corrigido com |
|---|---|---|---|
| `src/actions/appointment.action.ts` | criar/editar/cancelar/excluir consulta | `appointments.create` / `.edit` / `.cancel` | `requirePermission("appointments", ...)` |
| `src/actions/reviewAnamnese.action.ts` | marcar anamnese como revisada | `anamnesis.edit` | `requirePermission("anamnesis", "edit", ...)` |
| `src/actions/patient-timeline.action.ts` | ler timeline / adicionar nota clínica no prontuário | `medicalRecords.view` / `.create` | `requirePermission("medicalRecords", ...)` |

Antes da correção, qualquer membro de equipe autenticado no tenant (mesmo um
papel `VIEWER`, que por padrão **não** tem `appointments.create` nem
`medicalRecords.create`) conseguia chamar essas actions diretamente — o botão
ficava escondido pelo `<Can>` na UI, mas a Server Action em si não validava.
Isso é exatamente o cenário que RQ-5.1-03 pede para não existir.

`ai-assistant.action.ts`, `calendar.action.ts`, `patient-name.action.ts`
(somente leitura de nome), `shopping-list.action.ts` e `stickers.action.ts`
foram revisados e não têm uma permissão granular correspondente no catálogo
(`prisma/seed-permissions.ts`) — ficam cobertos apenas pelo isolamento de
tenant, que é a mesma política já aplicada a outras ações de baixo risco do
sistema.

## RQ-5.1-04/05/06 — Audit log de criação/edição/arquivamento/exclusão, acesso negado e alteração de permissão

**Status: confirmado.** `requirePermission` já grava `permission.denied` em
toda negativa (`src/lib/tenancy/requirePermission.ts:69-82`). `withAuditLog`
(`src/lib/audit/withAuditLog.ts`) envolve as Server Actions sensíveis e
classifica automaticamente o resultado (`SUCCESS`/`FAILURE`/`DENIED`) mesmo
quando a action retorna `{ error }` em vez de lançar exceção.

## RQ-5.1-07 — Logs não guardam conteúdo clínico bruto

**Status: confirmado.** `auditLogService.record` (`src/services/audit-log.service.ts`)
roda todo `metadata` por `sanitizeMetadata`, que redige por nome de chave
(`notes`, `summary`, `weight`, `bodyFat`, `skinfolds`, `measurements`,
`prontuario`, `token`, `password`, etc., recursivamente em objetos aninhados)
substituindo o valor por `"[SENSITIVE_DATA_REDACTED]"`. `resourceLabelSnapshot`/
`patientNameSnapshot` guardam só o **nome** do paciente (identificador
operacional), nunca diagnóstico/nota/dieta — consistente com o que
`docs/admin-global-guide.md` já declarava sobre o que o Global Admin pode ver.

## RQ-5.1-08/09 — Sessão revogada não continua válida

**Status: confirmado.** `getSessionFromCookies` (`src/lib/auth/cookies.ts:33-67`)
busca o `UserSession` pelo hash do token a cada request e retorna `null` se
`status !== "ACTIVE"` ou `expiresAt < now`. Como toda a cadeia de autorização
(`requireAuth`, `requireTenantAccess`, `requirePermission`,
`getCurrentTenantContext`) depende dessa mesma função, uma sessão revogada
por `sessionService.revokeSession` (`src/services/session.service.ts`) perde
acesso na próxima request, sem precisar de logout explícito.

## RQ-5.1-10 — Assistente/secretária limitados por padrão

**Status: confirmado.** `DEFAULT_ROLE_PERMISSIONS` em
`prisma/seed-permissions.ts` dá a `ASSISTANT`/`SECRETARY` apenas um
subconjunto pequeno (pacientes básico, agenda, dashboard, sessão própria) —
sem `medicalRecords.*`, sem `anamnesis.viewSensitive`, sem
`team.editPermissions`, sem `settings.editBilling`.

## RQ-5.1-11 — Overrides ALLOW/DENY prevalecem sobre o papel padrão

**Status: confirmado.** Em `getCurrentTenantContext.ts:86-98`, os overrides de
`MemberPermissionOverride` são aplicados **depois** das permissões de papel,
na mesma estrutura `Set`: `ALLOW` adiciona a chave, `DENY` remove — então um
`DENY` sempre vence, mesmo que o papel padrão tivesse concedido a permissão.

## RQ-5.1-12 — Build/typecheck/lint documentados

```bash
npx tsc --noEmit        # 0 erros (após as correções desta sprint)
npx vitest run          # 691/691 testes passando
```

`npm run build` não foi reexecutado nesta sessão (servidor `next dev` local
ativo trava o `prisma generate` no Windows — problema conhecido documentado em
`docs/CARE_SESSION_SIGNALING_PRODUCTION_DEPLOY.md`).

## Pendências desta sprint

1. **Testes automatizados de integração** (revogar sessão → próxima request
   falha; DENY override vence; cross-tenant 404) não foram escritos — exigiriam
   mockar `@/lib/prisma` e `next/headers` extensivamente, e este projeto ainda
   não tem esse padrão de mock estabelecido. A verificação feita foi por
   leitura direta do caminho de execução, não por teste automatizado novo.
2. **Teste manual em navegador** (login com 2 contas de tenants diferentes,
   DevTools Network) continua pendente — precisa ser feito por você, já que
   este ambiente não tem navegador.
3. `assertTenantOwnership` (`src/lib/tenancy/requirePermission.ts`) existe mas
   não é chamado em nenhum lugar — o isolamento já é garantido inline nas
   queries por `nutritionistId`, então não é uma vulnerabilidade, só um helper
   não utilizado.
