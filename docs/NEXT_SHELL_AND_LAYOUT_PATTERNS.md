# Shell e Layout Patterns — NutriOpus

## Princípio central

```
Layout = casca persistente e leve
loading.tsx = DashboardHeader (com título estático) + skeleton de conteúdo
Page shell = header com dados mínimos (nome, breadcrumb)
Content = dados pesados em Suspense
```

## Layout persistente

O `dashboard/[tenant]/layout.tsx` renderiza:
- `DashboardSidebar` — persiste entre navegações
- `MobileBottomNav` — persiste
- `FloatingActionDock` — persiste
- `{children}` — é aqui que o loading.tsx e pages renderizam

Regra: **nunca colocar queries pesadas no layout**. Apenas `assertTenantAccess` (auth check).

## loading.tsx correto

```tsx
// pacientes/loading.tsx
"use client";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientListSkeleton } from "@/components/skeletons/PatientListSkeleton";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";

export default function Loading() {
  const { t } = useI18n();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? "";

  return (
    <>
      <DashboardHeader
        title={t("nav.patients")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.patients"), current: true },
        ]}
      />
      <PatientListSkeleton />
    </>
  );
}
```

Por que client component? Para usar `useParams()` e obter o `tenant` para hrefs dos breadcrumbs, e `useI18n()` para tradução.

## PageHeader instantâneo

Para páginas com dados de header conhecidos estaticamente (Pacientes, Atendimentos, Agenda):
- DashboardHeader aparece do loading.tsx imediatamente
- Quando a page carrega, substitui o loading.tsx com o mesmo DashboardHeader + conteúdo real

Para páginas com dados dinâmicos no header (nome do paciente):
```tsx
// page.tsx — padrão shell-first
export default async function PatientDetailPage({ params }) {
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(...);

  // APENAS dados mínimos para o shell
  const [patient, latestMeasurement] = await Promise.all([
    getPatientById(session.nutritionistId, patientId),
    getLatestPatientMeasurement(session.nutritionistId, patientId),
  ]);

  return (
    <>
      <DashboardHeader title="Pacientes" breadcrumbs={[..., { label: patient.name, current: true }]} />
      <PatientStickyHeader patient={patient} latestMeasurement={latestMeasurement} />
      
      <Suspense fallback={<PatientBodySkeleton />}>
        <PatientBodyContent patient={patient} nutritionistId={...} patientId={...} />
      </Suspense>
    </>
  );
}
```

## Breadcrumb fora do conteúdo lento

O DashboardHeader retorna um React Fragment:
- `<header>` — navbar principal (título + toggles de idioma/tema)
- `<div>` — navegação contextual (back button + breadcrumbs)

Ambos aparecem quando o DashboardHeader renderiza — antes do conteúdo pesado.

## Botão voltar fora do conteúdo lento

O botão voltar é parte do DashboardHeader (via prop `backButton`). Ele usa `AppBackButton` que é um `<Link>` simples — sem dependência de dados.

## Dados mínimos para header

Para prontuário/detalhes de paciente:
```ts
const [patient, latestMeasurement] = await Promise.all([
  getPatientById(nutritionistId, patientId),
  getLatestPatientMeasurement(nutritionistId, patientId),
]);
```

Esses são queries simples e rápidas. O resto (timeline, goals, wellness, shopping list, etc.) vai para `PatientBodyContent`.

## Dados pesados em Suspense

```tsx
<Suspense fallback={<PatientBodySkeleton />}>
  <PatientBodyContent nutritionistId={...} patientId={...} patient={patient} tenant={tenant} />
</Suspense>
```

`PatientBodyContent` é um async server component que faz `Promise.all([...12 queries...])`.

## loading.tsx correto vs errado

```tsx
// ERRADO — spinner genérico, cobre tudo
export default function Loading() {
  return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
}

// ERRADO — skeleton de full page (cover sidebar, header, etc.)
export default function Loading() {
  return <FullPageSkeleton />; // inclui header fake
}

// CORRETO — header real + skeleton apenas de conteúdo
export default function Loading() {
  const { t } = useI18n();
  const { tenant } = useParams<{ tenant: string }>();
  return (
    <>
      <DashboardHeader title={t("nav.patients")} breadcrumbs={[...]} />
      <PatientListSkeleton />
    </>
  );
}
```

## Anti-patterns

- `layout.tsx` fazendo queries pesadas (patient lists, dashboard stats, etc.)
- `DashboardHeader` dentro de componente que depende de dados pesados
- Aguardar todos os dados antes de renderizar qualquer UI
- Skeleton que simula o header (duplicação visual durante loading)
- `history.back()` ou `router.back()` nos botões voltar (nunca — usar hrefs explícitos)
- `useEffect` para buscar dados principais (usar server components)
- Prisma em client components

## Exemplos por rota

### `/pacientes`
- loading.tsx: DashboardHeader "Pacientes" + PatientListSkeleton ✅
- page.tsx: await 3 queries → render PacientesPageClient
- Melhoria futura: Suspense para lista/stats separados

### `/pacientes/[patientId]`
- loading.tsx: DashboardHeader "Pacientes > ..." + PatientRecordSkeleton ✅
- page.tsx: await patient + latestMeasurement → shell → Suspense(PatientBodyContent) ✅

### `/atendimentos`
- loading.tsx: DashboardHeader "Atendimentos" + CareSessionsSkeleton ✅

### `/agenda`
- loading.tsx: DashboardHeader "Agenda" + AgendaSkeleton ✅
