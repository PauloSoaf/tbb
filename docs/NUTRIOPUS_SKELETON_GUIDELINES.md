# Skeleton Guidelines — NutriOpus

## Princípios

1. **Skeleton cobre apenas conteúdo dinâmico** — nunca navbar, sidebar, DashboardHeader
2. **Estrutura visual fiel** — skeleton deve ter a mesma altura/layout que o conteúdo real
3. **Sem tela branca** — sempre há algo útil visível durante loading
4. **Granular por seção** — diferentes blocos podem ter skeletons independentes

## Componentes disponíveis

| Componente | Uso |
|---|---|
| `SkeletonBase` | Bloco base animado (animate-pulse) |
| `CardGridSkeleton` | Grid de cards de estatística |
| `TableSkeleton` | Tabela com linhas/colunas |
| `DashboardSkeleton` | Conteúdo do dashboard geral |
| `PatientListSkeleton` | Lista de pacientes (search + table + pagination) |
| `PatientRecordSkeleton` | Prontuário completo (avatar + tabs + grid) |
| `PatientBodySkeleton` | Corpo do prontuário (timeline + sidebar) |
| `CareSessionsSkeleton` | Lista de atendimentos |
| `AgendaSkeleton` | Agenda semanal |
| `ChartSkeleton` | Gráfico em loading |
| `TimelineSkeleton` | Timeline de eventos |
| `FormSkeleton` | Formulário em loading |
| `MealPlanStudioSkeleton` | Editor de plano alimentar |
| `PortalDashboardSkeleton` | Dashboard do portal do paciente |
| `PortalMealPlanSkeleton` | Cardápio do portal |

## Onde usar cada skeleton

### Em loading.tsx

```tsx
// loading.tsx — inclui DashboardHeader + skeleton de conteúdo
"use client";
export default function Loading() {
  const { t } = useI18n();
  const { tenant } = useParams<{ tenant: string }>();
  return (
    <>
      <DashboardHeader title={t("nav.patients")} breadcrumbs={[...]} />
      <PatientListSkeleton />   {/* apenas o conteúdo */}
    </>
  );
}
```

### Em Suspense boundaries

```tsx
<Suspense fallback={<PatientBodySkeleton />}>
  <PatientBodyContent ... />
</Suspense>

<Suspense fallback={<ChartSkeleton />}>
  <EvaluationChart ... />
</Suspense>
```

## Criar novo skeleton

Regras:
1. Não incluir header/navbar no skeleton (o loading.tsx cuida disso)
2. Usar apenas `SkeletonBase` e Tailwind tokens do projeto
3. Usar `aria-hidden="true"` no container raiz
4. Usar `bg-border-neutral/50 dark:bg-border-neutral/30` (já no SkeletonBase)
5. Manter a mesma estrutura do layout real (grid, espaçamentos)

```tsx
import { SkeletonBase } from "./SkeletonBase";

export function MySectionSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-6 w-40" />
        <SkeletonBase className="h-9 w-32" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-2">
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
```

## Anti-patterns

```tsx
// ERRADO — spinner genérico
export default function Loading() {
  return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
}

// ERRADO — skeleton com header fake (duplica o header real do loading.tsx)
export function MySkeleton() {
  return (
    <div>
      <div className="border-b p-4">  {/* NÃO! */}
        <SkeletonBase className="h-6 w-32" />
      </div>
      <div className="p-6">...</div>
    </div>
  );
}

// CORRETO — skeleton apenas de conteúdo
export function MySkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      {/* apenas o conteúdo, sem header */}
    </div>
  );
}
```

## Tokens de cor

```
bg-border-neutral/50      — skeleton em light mode
dark:bg-border-neutral/30 — skeleton em dark mode
border-border-neutral     — bordas de cards skeleton
bg-card-bg               — fundo de cards skeleton
```

Todos já estão no `SkeletonBase` — use apenas `className` para tamanho/forma.
