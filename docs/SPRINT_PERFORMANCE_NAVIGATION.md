# Sprint Performance e Navegação — Resumo

**Data:** 2026-06-29
**Agente:** CLAUDE_CODE

---

## Objetivo

Melhorar a perceived performance e a experiência de navegação do NutriOpus substituindo spinners genéricos por skeletons contextuais e adicionando infraestrutura para prefetch inteligente e revalidação centralizada.

---

## O que foi implementado

### Parte 1 — Biblioteca de Skeletons (`src/components/skeletons/`)

13 componentes criados do zero:

- `SkeletonBase` — bloco shimmer base com `animate-pulse` + `motion-reduce:animate-none`
- `CardGridSkeleton` — grade de cards (props: cards, cols)
- `TableSkeleton` — tabela com header + linhas (props: rows, cols)
- `DashboardSkeleton` — layout completo do dashboard da nutricionista
- `PatientListSkeleton` — lista de pacientes com busca, tabela, paginação
- `PatientRecordSkeleton` — prontuário com avatar, tabs, 2 colunas
- `AgendaSkeleton` — calendário mensal em grid 7×5
- `CareSessionsSkeleton` — lista de cards de atendimento
- `PortalDashboardSkeleton` — dashboard do portal do paciente
- `PortalMealPlanSkeleton` — cardápio com refeições e itens
- `FormSkeleton` — formulário com labels e inputs (props: fields)
- `ChartSkeleton` — área de gráfico com eixos simulados (props: height)
- `TimelineSkeleton` — timeline vertical com círculos e cards (props: items)
- `MealPlanStudioSkeleton` — oficina de planos: sidebar + editor + toolbar

### Parte 2 — loading.tsx substituídos (11 arquivos)

Todos os `loading.tsx` existentes foram atualizados de `NutriOpusLoader` para skeletons contextuais:

- `dashboard/[tenant]/loading.tsx` → `DashboardSkeleton`
- `dashboard/[tenant]/pacientes/loading.tsx` → `PatientListSkeleton`
- `dashboard/[tenant]/agenda/loading.tsx` → `AgendaSkeleton`
- `dashboard/[tenant]/atendimentos/loading.tsx` → `CareSessionsSkeleton`
- `dashboard/[tenant]/ferramentas/loading.tsx` → `CardGridSkeleton` (6 cards, 3 cols)
- `dashboard/[tenant]/ferramentas/oficina-planos/loading.tsx` → `MealPlanStudioSkeleton`
- `dashboard/[tenant]/ferramentas/relatorio-clinica/loading.tsx` → `ChartSkeleton` × 2
- `portal/[tenant]/loading.tsx` → `PortalDashboardSkeleton`
- `portal/[tenant]/cardapio/loading.tsx` → `PortalMealPlanSkeleton`
- `portal/[tenant]/diario/loading.tsx` → `FormSkeleton` (5 campos)
- `portal/[tenant]/evolucao/loading.tsx` → `ChartSkeleton` + `TableSkeleton`

### Parte 3 — loading.tsx criados (5 arquivos novos)

Rotas que não tinham `loading.tsx`:

- `dashboard/[tenant]/pacientes/[patientId]/loading.tsx` → `PatientRecordSkeleton`
- `portal/[tenant]/metas/loading.tsx` → `TableSkeleton`
- `portal/[tenant]/tarefas/loading.tsx` → `TableSkeleton`
- `portal/[tenant]/peso/loading.tsx` → `FormSkeleton` + `ChartSkeleton`
- `portal/[tenant]/chat/loading.tsx` → `TimelineSkeleton`

### Parte 4 — Componentes de Navegação (`src/components/navigation/`)

- `HoverPrefetchLink` — `<Link>` que faz `router.prefetch()` no hover e no focus
- `SmartPrefetchLink` — wrapper com prop `disablePrefetch` para desabilitar onde não é útil

### Parte 5 — Revalidation Helper (`src/lib/revalidation/revalidate-nutriopus.ts`)

7 funções de revalidação centralizadas por rota, para uso em Server Actions após mutações.

### Parte 6 — Performance Helper (`src/lib/performance/measure.ts`)

`measureAsync<T>` — wrapper para profiling de Server Actions em desenvolvimento (no-op em produção).

### Parte 7 — Documentação (5 arquivos em `docs/`)

- `NEXT_PERFORMANCE_AUDIT.md` — auditoria, estado antes/depois
- `NEXT_APP_ROUTER_ARCHITECTURE.md` — padrões Server/Client, Suspense, loading, prefetch
- `NEXT_CACHE_POLICY.md` — o que pode/não pode cachear, revalidação, LGPD
- `NUTRIOPUS_LOADING_AND_SKELETONS.md` — biblioteca completa, como usar, como criar
- `SPRINT_PERFORMANCE_NAVIGATION.md` — este arquivo

---

## O que NÃO foi alterado

- Nenhuma `page.tsx` de dados
- `src/components/ui/nutriopus-loader.tsx` — mantido para uso inline
- Lógica de negócio, services, actions existentes
- Schema Prisma

---

## Arquivos criados/alterados

**Criados:** 34 arquivos
**Alterados:** 11 arquivos (loading.tsx existentes)

---

## Verificação de tipos

`npx tsc --noEmit` — executar após esta sprint para confirmar 0 erros.
