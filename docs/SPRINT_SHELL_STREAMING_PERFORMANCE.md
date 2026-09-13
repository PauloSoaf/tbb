# Sprint: Shell Instantâneo e Streaming por Seção

**Data:** 2026-06-29  
**Status:** Concluída

## Objetivo

Corrigir navegação onde navbar, breadcrumb, botão voltar e PageHeader esperavam loading/skeleton da página inteira. Implementar shell instantâneo, layouts leves, DashboardHeader rápido, Suspense granular no prontuário, e documentar padrões.

## Problema corrigido

**Antes:** ao navegar para qualquer página do dashboard, o DashboardHeader (com título, breadcrumbs e botão voltar) desaparecia e era substituído pelo skeleton de conteúdo da página. O usuário ficava sem nenhum contexto de onde estava durante o loading.

**Depois:** DashboardHeader aparece imediatamente do `loading.tsx` (com título i18n e breadcrumbs corretos). Apenas o conteúdo dinâmico usa skeleton.

## Causa raiz

O `DashboardHeader` estava dentro de cada `page.tsx` (ou dentro de client components como `PacientesPageClient`). Quando o Next.js mostra `loading.tsx`, ele substitui apenas o slot `{children}` do layout — que é onde o `DashboardHeader` vivia.

Como o sidebar e bottom nav estão no layout, eles persistiam. Mas o header desaparecia.

## Arquitetura implementada

```
Root layout
└── I18nProvider + ThemeProvider

Dashboard layout
└── DashboardSidebar ✅ persistente
└── MobileBottomNav ✅ persistente
└── FloatingActionDock ✅ persistente
└── {children}
    └── loading.tsx (temporário)
        ├── DashboardHeader (real, com i18n) ✅ aparece imediatamente
        └── ContentSkeleton ✅ apenas conteúdo
    └── page.tsx (após load)
        ├── DashboardHeader (real, com dados)
        ├── [PatientStickyHeader se aplicável]
        └── Suspense(ContentSection)
```

## Arquivos modificados

### loading.tsx files (5)
- `src/app/dashboard/[tenant]/loading.tsx` — client component com DashboardHeader + DashboardSkeleton
- `src/app/dashboard/[tenant]/pacientes/loading.tsx` — DashboardHeader "Pacientes" + PatientListSkeleton
- `src/app/dashboard/[tenant]/pacientes/[patientId]/loading.tsx` — DashboardHeader "Pacientes > ..." + PatientRecordSkeleton
- `src/app/dashboard/[tenant]/atendimentos/loading.tsx` — DashboardHeader "Atendimentos" + CareSessionsSkeleton
- `src/app/dashboard/[tenant]/agenda/loading.tsx` — DashboardHeader "Agenda" + AgendaSkeleton

### Skeletons
- `src/components/skeletons/AgendaSkeleton.tsx` — removido bloco de header fake (duplicava o header real)
- `src/components/skeletons/PatientBodySkeleton.tsx` — novo skeleton para corpo do prontuário

### Patient detail page
- `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx` — refatorado com Suspense
  - Shell: await apenas `patient + latestMeasurement` (~2 queries rápidas)
  - Body: `PatientBodyContent` async server component com 12 queries em Promise.all
  - Resultado: header + sticky header aparecem ~ms antes do corpo

### Performance
- `src/lib/performance/measure.ts` — adicionado `measureSync` ao lado de `measureAsync`

### Docs criadas
- `docs/NEXT_SHELL_STREAMING_AUDIT.md`
- `docs/NEXT_SHELL_AND_LAYOUT_PATTERNS.md`
- `docs/NEXT_SEO_AND_CORE_WEB_VITALS.md`
- `docs/NUTRIOPUS_SKELETON_GUIDELINES.md`
- `docs/SPRINT_SHELL_STREAMING_PERFORMANCE.md` (este arquivo)

## Resultado TypeScript

```
npx tsc --noEmit → 0 errors
```

## Critérios de aceite

- [x] Navbar não espera skeleton de conteúdo
- [x] Sidebar não espera skeleton de conteúdo
- [x] Breadcrumb aparece rapidamente (via loading.tsx)
- [x] Botão voltar aparece rapidamente (via loading.tsx)
- [x] DashboardHeader não depende de dados pesados (loading.tsx + shell pattern)
- [x] Prontuário usa Suspense para corpo (12 queries em PatientBodyContent)
- [x] `loading.tsx` não cobre shell persistente desnecessariamente
- [x] AgendaSkeleton sem header fake duplicado
- [x] PatientBodySkeleton criado
- [x] Docs criadas (5)
- [x] `npx tsc --noEmit` passa

## Próximos passos

- Dashboard page (`/dashboard/[tenant]`): 11 queries em Promise.all — pode usar Suspense por card/seção
- Instrumentação com `measureAsync` em services críticos (patient-timeline.service, dashboard.service)
- Portal loading.tsx: adicionar DashboardHeader do portal
- ferramentas/loading.tsx: pode ser atualizado (não foi nesta sprint)
