# NutriOpus — Next.js App Router Architecture

**Versão:** Next.js App Router (sem Pages Router)
**Data:** 2026-06-29

> Leia `node_modules/next/dist/docs/` antes de qualquer mudança — APIs e convenções podem diferir do seu conhecimento anterior.

---

## Regras fundamentais

### Server Components (padrão)
Todo arquivo em `app/` é Server Component por padrão. Use para:
- Fetching de dados (Prisma, APIs internas)
- Renderização de conteúdo estático ou semi-estático
- Componentes sem estado interativo

```tsx
// app/dashboard/[tenant]/page.tsx — CORRETO
import { db } from "@/lib/prisma";

export default async function DashboardPage({ params }: { params: { tenant: string } }) {
  const [stats, appointments] = await Promise.all([
    db.query1(),
    db.query2(),
  ]);
  return <DashboardView stats={stats} appointments={appointments} />;
}
```

### Client Components — quando usar `"use client"`
Adicionar `"use client"` APENAS quando o componente precisar de:
- `useState`, `useReducer`, `useEffect`, `useRef`
- Event handlers (onClick, onSubmit, onChange)
- Browser APIs (localStorage, window, navigator)
- Bibliotecas que requerem contexto do browser (recharts, framer-motion)

```tsx
// CORRETO — precisa de estado
"use client";
import { useState } from "react";
export function SearchInput() { ... }

// ERRADO — não adicionar "use client" sem necessidade
"use client"; // desnecessário
export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>; // sem state, sem eventos
}
```

### Anti-patterns proibidos
- `"use client"` em `page.tsx`, `layout.tsx`, `loading.tsx` — nunca
- `useEffect` para fetching de dados — use Server Component ou Server Action
- `fetch` no client sem necessidade — prefira passar dados via props do Server Component
- `useState` para dados que vêm do servidor e não mudam — prefira Server Component

---

## Data fetching

### Padrão correto: Promise.all no Server Component
```tsx
const [patients, stats, appointments] = await Promise.all([
  getPatients(tenant),
  getStats(tenant),
  getAppointments(tenant),
]);
```

### Server Actions para mutações
```typescript
"use server";
import { revalidatePath } from "next/cache";

export async function createPatientAction(data: FormData) {
  await db.patient.create({ ... });
  revalidatePath(`/dashboard/${tenant}/pacientes`);
}
```

Use os helpers de `src/lib/revalidation/revalidate-nutriopus.ts` para revalidar rotas após mutações.

### Cache
- Por padrão, `fetch` em Server Components é cacheado (Next.js estende o `fetch` nativo)
- Prisma queries **não** são cacheadas automaticamente — use `unstable_cache` se necessário
- Para dados sensíveis (prontuário, dados clínicos): **nunca cachear** — ver `docs/NEXT_CACHE_POLICY.md`

---

## Suspense e loading.tsx

### Como funciona
O arquivo `loading.tsx` em qualquer segmento é automaticamente envolvido em `<Suspense>` pelo Next.js. Quando a `page.tsx` (Server Component) está carregando, o `loading.tsx` é exibido.

### Padrão NutriOpus
Todos os `loading.tsx` devem usar skeletons contextuais de `src/components/skeletons/`, não spinners genéricos. O skeleton deve imitar a estrutura da página que será carregada.

```tsx
// loading.tsx — CORRETO
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
export default function Loading() { return <DashboardSkeleton />; }

// loading.tsx — ERRADO (não usar)
import { NutriOpusLoader } from "@/components/ui/nutriopus-loader";
export default function Loading() { return <NutriOpusLoader />; }
```

`NutriOpusLoader` é reservado para estados de loading **inline** (botões com spinner, áreas pequenas dentro de componentes já carregados).

---

## Prefetch de rotas

### Comportamento padrão do Next.js
- `<Link>` com `prefetch={true}` (padrão em produção): prefetcha ao entrar no viewport
- Isso pode gerar muitas requisições desnecessárias em sidebars com muitos links

### Padrão NutriOpus: prefetch sob demanda
Use `HoverPrefetchLink` ou `SmartPrefetchLink` de `src/components/navigation/` para prefetchear apenas quando o usuário demonstra intenção (hover ou focus):

```tsx
import { SmartPrefetchLink } from "@/components/navigation/SmartPrefetchLink";

// Prefetch no hover (recomendado para sidebar)
<SmartPrefetchLink href={`/dashboard/${tenant}/pacientes`}>
  Pacientes
</SmartPrefetchLink>

// Sem prefetch (links pouco usados ou com dados sensíveis)
<SmartPrefetchLink href={url} disablePrefetch>
  Link raro
</SmartPrefetchLink>
```

---

## Estrutura de arquivos

```
app/
  dashboard/[tenant]/
    layout.tsx          # Server Component — layout com sidebar
    loading.tsx         # Skeleton contextual — NÃO usar "use client"
    page.tsx            # Server Component — Promise.all para dados
    pacientes/
      loading.tsx       # PatientListSkeleton
      page.tsx          # Server Component
      [patientId]/
        loading.tsx     # PatientRecordSkeleton
        page.tsx        # Server Component
```

---

## Hierarquia de componentes

```
page.tsx (Server) 
  → layout.tsx (Server)
  → loading.tsx (Server — renderiza skeleton)
  → Componentes de UI puros (Server)
    → Componentes interativos ("use client") apenas onde necessário
```
