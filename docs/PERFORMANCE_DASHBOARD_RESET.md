# Performance do Dashboard — Diagnóstico e Correções

> **Atualizado em: 04/07/2026** · Sintoma reportado: dashboard 8s, página de paciente com `#anamneses` até 16s em produção (www.nutriopus.com.br); 4-8s no dev local; "um monte de requisição" no Network quando deviam ser poucas.

## Resumo executivo

O problema **não era** "Next é lento" nem exigia migrar para SPA/Angular/Vite. Eram quatro causas mensuráveis, todas corrigidas nesta sprint:

| # | Causa raiz | Efeito | Correção |
|---|---|---|---|
| 1 | **Storm de prefetch**: ~40 `<Link>` por página, cada um disparando um render RSC completo no servidor (auth + Prisma) | dezenas de requests `?_rsc=` competindo com a navegação real; pool do banco saturado | `prefetch={false}` em 36 links de ação/por-item (14 na página do paciente + 22 em componentes do dashboard) |
| 2 | **Auth repetida com query ao banco**: `assertTenantAccess` fazia `nutritionist.findUnique` em TODA chamada — layout + page + cada prefetch = 2+ queries só para autenticar | ~300-500ms desperdiçados por navegação; multiplicado pelo storm | `React.cache` (dedup por request) + `unstable_cache` com tag (dedup entre requests); perfil invalida a tag ao salvar |
| 3 | **`connection_limit=1` no dev local**: todas as "queries paralelas" (11 no dashboard) serializavam em UMA conexão com Supabase São Paulo (~80-120ms RTT de Manaus cada) | 11 × RTT em fila = 1-2s só de banco, por página, no dev | `connection_limit=10` no `.env` local (processo único de longa duração — pode) |
| 4 | **Região da Vercel ≠ região do banco**: Supabase em `sa-east-1` (São Paulo); functions da Vercel na default `iad1` (EUA) → **cada query paga ~140ms de ida-e-volta intercontinental** | cadeia de queries × 140ms = segundos; é o principal culpado dos 8-16s em produção | `vercel.json` com `"regions": ["gru1"]` (São Paulo) |

Bônus: `resolvePatientIdFromRouteParam` fazia uma query por id exato que **sempre falhava** para slugs (slugs têm `-`, cuids não) — round-trip desperdiçado em toda navegação de paciente. Agora pula o lookup inútil e é memoizado por request.

## Por que "um monte de requisição"?

Aquela enxurrada de `avaliacoes?_rsc=...`, `novo?_rsc=...`, `editar?_rsc=...`, `sergio-3vh2rmri?_rsc=...` no Network **não era a página buscando dados** — era o **prefetch automático** do `<Link>` do Next: todo link visível dispara uma pré-renderização da rota de destino no servidor. Em página estática isso é grátis; em rota dinâmica (todas as do dashboard usam cookies), cada prefetch = renderização real com auth + queries.

Com 17 links no grid de ações do paciente + 3 links × N itens nas listas do dashboard, uma única visita disparava 20-40 renders servidor-side "invisíveis" — cada um pagando auth (2 queries antes do fix) + a latência intercontinental (causa 4). O prefetch continua ativo apenas na navegação principal (sidebar), onde ele realmente ajuda.

## O que foi alterado (arquivos)

- `src/lib/tenancy/assertTenantAccess.ts` — `React.cache` + `unstable_cache(600s, tag nutritionist:{slug})`.
- `src/actions/updateNutritionistConfig.action.ts` — `revalidateTag(NUTRITIONIST_CACHE_TAG, { expire: 0 })` ao salvar perfil.
- `src/services/patient-route.service.ts` — pula lookup por id exato quando o param é slug; `React.cache`.
- `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx` — 14 links com `prefetch={false}`.
- 12 componentes de dashboard/pacientes — 22 links com `prefetch={false}` (StatsCard, AppointmentDashboardItem, AnamneseSummaryCard, UpcomingAppointmentsList, UnreadMessagesPanel, PatientsNeedingActionList, DashboardAlertsClient, DashboardPageClient, PacientesPageClient, PatientStickyHeader, PatientActionLink, PatientShoppingListSummaryCard).
- `.env` local — `connection_limit=1` → `10`.
- `vercel.json` — **novo**, fixa functions em `gru1` (São Paulo, mesma região do Supabase).

## O que VOCÊ precisa fazer no deploy

1. **Confira a env `DATABASE_URL` na Vercel**: deve continuar com `pgbouncer=true&connection_limit=1` (em serverless cada instância tem a própria conexão — 1 por lambda é o correto; os `10` são só para o dev local).
2. **Redeploy** — o `vercel.json` novo só vale a partir do próximo build. Confirme em Project → Settings → Functions que a região ficou **São Paulo (gru1)**.
3. Valide (abaixo).

## Como validar

**Produção** (após redeploy):
1. `https://www.nutriopus.com.br/dashboard/fabiola` com Network aberto: a navegação deve fazer ~1 request RSC da página (+ prefetches só da sidebar), sem a enxurrada de `?_rsc=` de cards.
2. Dashboard: meta < 2.5s primeira carga fria, < 1s navegações seguintes (Router Cache de 5 min).
3. Página do paciente: shell (header + cards de resumo) aparece primeiro, corpo pesado em streaming logo atrás.

**Local (medida honesta = build de produção, não `next dev`)**:
```bash
npm run build
npm run start
# medir /dashboard/fabiola e /dashboard/fabiola/pacientes/<slug>
```
O `next dev` compila rota na primeira visita (2-5s de compilação que NÃO existem em produção) — nunca conclua performance a partir do dev.

## O que NÃO foi feito (e quando fazer)

- **Converter o dashboard para client-fetch total (TanStack Query em tudo)** — a proposta "app-first" do texto que você colou. Não fiz porque as quatro correções acima atacam as causas medidas; converter tudo agora seria uma reescrita grande com risco alto. **Critério objetivo**: se após o redeploy a primeira carga do dashboard ainda passar de ~2.5s em produção, a próxima etapa é servir o shell estático e buscar blocos via TanStack Query (a infra já existe — provider + query-keys instalados).
- **Métricas contínuas** — para a monografia, vale registrar tempos antes/depois com o Lighthouse/Web Vitals da Vercel.

## Nota para a monografia (histórico)

Em produção serverless, a distância entre a function e o banco domina tudo: cada query paga o RTT completo. Com functions nos EUA e banco em São Paulo, ~140ms/query × N queries sequenciais (auth → slug → dados) + storm de prefetch multiplicando renders = 8-16s. A correção não foi "otimizar código quente", foi **colocalizar computação e dados** (gru1 + sa-east-1), **eliminar trabalho invisível** (prefetch de 40 rotas dinâmicas) e **deduplicar o caminho crítico** (auth memoizada, slug resolvido uma vez).
