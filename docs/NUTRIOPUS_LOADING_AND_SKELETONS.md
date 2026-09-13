# NutriOpus — Loading States e Biblioteca de Skeletons

**Data:** 2026-06-29

---

## Visão geral

O NutriOpus usa skeletons contextuais em vez de spinners genéricos. Cada `loading.tsx` retorna um skeleton que imita a estrutura do conteúdo real, reduzindo o CLS (Cumulative Layout Shift) e melhorando a perceived performance.

---

## Componentes disponíveis

Todos em `src/components/skeletons/`.

### `SkeletonBase`
Componente base. Bloco shimmer com `animate-pulse` e suporte a `motion-reduce:animate-none`.

```tsx
import { SkeletonBase } from "@/components/skeletons/SkeletonBase";

<SkeletonBase className="h-4 w-32" />
<SkeletonBase className="h-8 w-8 rounded-full" />
```

### `CardGridSkeleton`
Grade de cards shimmer.

```tsx
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

// 4 cards em 4 colunas (padrão)
<CardGridSkeleton />

// 6 cards em 3 colunas
<CardGridSkeleton cards={6} cols={3} />

// 2 cards em 2 colunas
<CardGridSkeleton cards={2} cols={2} />
```

**Props:** `cards?: number` (default 4), `cols?: 2 | 3 | 4` (default 4)

### `TableSkeleton`
Tabela shimmer com header e linhas.

```tsx
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

<TableSkeleton rows={8} cols={5} />
```

**Props:** `rows?: number` (default 6), `cols?: number` (default 5)

### `FormSkeleton`
Sequência de label + input shimmer.

```tsx
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

<FormSkeleton fields={4} />
```

**Props:** `fields?: number` (default 4)

### `ChartSkeleton`
Área de gráfico shimmer com eixos simulados.

```tsx
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

<ChartSkeleton height="h-48" />
<ChartSkeleton height="h-64" />
```

**Props:** `height?: string` (default `"h-48"`)

### `TimelineSkeleton`
Timeline vertical com círculos e cards shimmer.

```tsx
import { TimelineSkeleton } from "@/components/skeletons/TimelineSkeleton";

<TimelineSkeleton items={5} />
```

**Props:** `items?: number` (default 5)

### Skeletons de página completa
Para uso em `loading.tsx`:

| Componente | Uso |
|------------|-----|
| `DashboardSkeleton` | Dashboard da nutricionista |
| `PatientListSkeleton` | Lista de pacientes |
| `PatientRecordSkeleton` | Prontuário do paciente |
| `AgendaSkeleton` | Agenda (calendário) |
| `CareSessionsSkeleton` | Atendimentos online |
| `MealPlanStudioSkeleton` | Oficina de planos alimentares |
| `PortalDashboardSkeleton` | Dashboard do portal do paciente |
| `PortalMealPlanSkeleton` | Cardápio do paciente |

---

## Como adicionar um novo loading.tsx

1. Identifique qual skeleton melhor imita o layout da página
2. Crie (ou reutilize) o skeleton adequado
3. Crie o `loading.tsx` no segmento correto:

```tsx
// src/app/dashboard/[tenant]/nova-rota/loading.tsx
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
```

**Importante:** `loading.tsx` é Server Component — não adicionar `"use client"`.

---

## Como criar um novo skeleton

1. Crie em `src/components/skeletons/NomeSkeleton.tsx`
2. Use `SkeletonBase` para os blocos shimmer
3. Replique a estrutura visual da página real (padding, grid, proporções)
4. Use tokens CSS do design system: `bg-card-bg`, `bg-warm-surface`, `border-border-neutral`

```tsx
import { SkeletonBase } from "./SkeletonBase";

export function MinhaRotaSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      <SkeletonBase className="h-6 w-48" />
      <SkeletonBase className="h-4 w-full" />
      <SkeletonBase className="h-4 w-3/4" />
    </div>
  );
}
```

---

## Acessibilidade

- Todos os skeletons têm `aria-hidden="true"` — não são lidos por screen readers
- O Next.js anuncia automaticamente mudanças de rota para screen readers via `aria-live`
- `motion-reduce:animate-none` respeita `prefers-reduced-motion`

---

## NutriOpusLoader vs Skeletons

| Onde usar | Componente |
|-----------|-----------|
| `loading.tsx` de rota | Skeleton contextual |
| Botão com ação em andamento | `NutriOpusLoader` ou `Loader2` inline |
| Loading state de modal | `NutriOpusLoader` ou skeleton inline |
| Área pequena dentro de componente carregado | `NutriOpusLoader` |
