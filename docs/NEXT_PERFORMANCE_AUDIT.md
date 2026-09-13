# NutriOpus — Next.js Performance Audit

**Data:** 2026-06-29
**Agente:** CLAUDE_CODE

---

## Estado encontrado antes da sprint

### Server Components (correto — não alterado)
- `src/app/dashboard/[tenant]/page.tsx` — Server Component com `Promise.all` para queries paralelas
- Todas as `page.tsx` do dashboard e portal eram/são Server Components corretos
- `useEffect` no app/ limitado a casos legítimos: chat polling, busca TACO (não alterados)
- `"use client"` presente apenas em componentes que precisam: forms, charts, modais

### Loading states (problema identificado e corrigido)
Todos os `loading.tsx` usavam `NutriOpusLoader` com spinner redondo genérico (`Loader2` + `animate-spin`).

**Impacto:** CLS (Cumulative Layout Shift) elevado — o spinner não tem tamanho relacionado ao conteúdo que será exibido, causando salto de layout ao carregar. Experiência de loading não informa o usuário sobre o que está carregando.

### Componentes faltantes
- `src/components/skeletons/` — não existia; criado do zero
- `loading.tsx` em rotas críticas: `[patientId]/`, `metas/`, `tarefas/`, `peso/`, `chat/` do portal — não existiam

---

## O que foi corrigido

### 1. Substituição de spinners por skeletons contextuais
Cada `loading.tsx` agora retorna um skeleton que imita o layout real da página que será carregada.

| Rota | Skeleton usado |
|------|---------------|
| `/dashboard/[tenant]` | `DashboardSkeleton` |
| `/dashboard/[tenant]/pacientes` | `PatientListSkeleton` |
| `/dashboard/[tenant]/pacientes/[patientId]` | `PatientRecordSkeleton` |
| `/dashboard/[tenant]/agenda` | `AgendaSkeleton` |
| `/dashboard/[tenant]/atendimentos` | `CareSessionsSkeleton` |
| `/dashboard/[tenant]/ferramentas` | `CardGridSkeleton` (6 cards, 3 cols) |
| `/dashboard/[tenant]/ferramentas/oficina-planos` | `MealPlanStudioSkeleton` |
| `/dashboard/[tenant]/ferramentas/relatorio-clinica` | `ChartSkeleton` × 2 |
| `/portal/[tenant]` | `PortalDashboardSkeleton` |
| `/portal/[tenant]/cardapio` | `PortalMealPlanSkeleton` |
| `/portal/[tenant]/diario` | `FormSkeleton` |
| `/portal/[tenant]/evolucao` | `ChartSkeleton` + `TableSkeleton` |
| `/portal/[tenant]/metas` | `TableSkeleton` |
| `/portal/[tenant]/tarefas` | `TableSkeleton` |
| `/portal/[tenant]/peso` | `FormSkeleton` + `ChartSkeleton` |
| `/portal/[tenant]/chat` | `TimelineSkeleton` |

### 2. Biblioteca de skeletons criada
`src/components/skeletons/` com 13 componentes reutilizáveis.

### 3. Navegação com prefetch sob demanda
`HoverPrefetchLink` e `SmartPrefetchLink` para prefetch no hover/focus, evitando prefetch desnecessário de todas as rotas ao carregar.

### 4. Helpers utilitários
- `src/lib/revalidation/revalidate-nutriopus.ts` — funções centralizadas de revalidação por rota
- `src/lib/performance/measure.ts` — `measureAsync` para profiling de Server Actions em desenvolvimento

---

## Problemas não introduzidos

- Nenhuma `page.tsx` de dados foi alterada
- `src/components/ui/nutriopus-loader.tsx` mantido (ainda usado em botões inline)
- Zero alterações em lógica de negócio

---

## Métricas esperadas após a sprint

- **CLS reduzido:** skeletons ocupam o mesmo espaço que o conteúdo real
- **Perceived performance:** usuário vê estrutura da página imediatamente, sem tela em branco
- **LCP melhorado:** Server Components já eram corretos; skeletons não afetam dados reais
- **Prefetch inteligente:** rotas prefetchadas apenas quando o usuário demonstra intenção de navegar
