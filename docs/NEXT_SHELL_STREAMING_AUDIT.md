# Next Shell Streaming Audit

## Problema relatado

Ao navegar entre páginas, elementos persistentes (navbar, sidebar, breadcrumb, botão voltar, título) desapareciam e eram substituídos pelo loading skeleton da página inteira.

Causa raiz: o DashboardHeader estava dentro de cada `page.tsx`, não no layout. Portanto, quando o `loading.tsx` assumia o slot de `{children}`, o header some junto com o conteúdo.

## Rotas analisadas

- `/dashboard/[tenant]` — Dashboard geral
- `/dashboard/[tenant]/pacientes` — Lista de pacientes
- `/dashboard/[tenant]/pacientes/[patientId]` — Prontuário do paciente
- `/dashboard/[tenant]/atendimentos` — Atendimentos
- `/dashboard/[tenant]/agenda` — Agenda
- `/dashboard/[tenant]/ferramentas` — Ferramentas
- `/portal/[tenant]` — Portal do paciente

## Layouts que bloqueiam navegação

- `dashboard/[tenant]/layout.tsx`: executa `assertTenantAccess(tenant)` (auth check — inevitável, mas rápido)
- `portal/[tenant]/layout.tsx`: executa 2 queries (patient name + nutritionist whatsapp) — relativamente rápido

Ambos os layouts SÃO a casca persistente. O sidebar e a nav do portal aparecem assim que o layout resolve.

## Headers que esperam dados pesados

- **Patient detail page** (`/pacientes/[patientId]/page.tsx`): DashboardHeader estava num `Promise.all([...14 queries])` — o header só aparecia depois de TODAS as 14 queries resolverem.
- **Dashboard page**: DashboardHeader aguardava 11 queries em paralelo.

## Breadcrumbs que dependem da page inteira

Breadcrumbs no DashboardHeader são passados como props statically. O problema não eram os breadcrumbs em si, mas que o componente inteiro (incluindo breadcrumbs) só renderizava após todas as queries completarem.

## loading.tsx amplos demais

Todos os `loading.tsx` existentes retornavam apenas um skeleton de conteúdo (correto), mas SEM o DashboardHeader. Resultado: durante o loading, o usuário via sidebar + skeleton de conteúdo sem nenhum header.

## Skeletons cobrindo coisa que deveria persistir

- `AgendaSkeleton`: incluía um bloco header-like com skeletons de barras (duplicando o visual do DashboardHeader real que ainda não aparecia)

## Páginas sem Suspense granular

- `PatientDetailPage`: monolítica — 14 queries em Promise.all, nada em Suspense
- `DashboardPage`: 11 queries em Promise.all, nada em Suspense
- `PacientesPage`: 3 queries em Promise.all, nada em Suspense

## Queries lentas em Server Components

- `getPatientTimeline` — busca timeline completa do paciente (HEAVY)
- `getAnthropometryEvolutionData` — dados de evolução para gráficos (MEDIUM)
- `getDashboardStats` — agregações de dashboard (MEDIUM)
- `getRecentMealPlanSummary` — planos recentes (MEDIUM)

## Oportunidades de shell instantâneo

- `loading.tsx` com DashboardHeader estático + i18n
- Patient detail: await apenas `patient + latestMeasurement`, streamar o resto
- Dashboard: potencial de Suspense por card/seção (futuro)

## Correções aplicadas

1. **loading.tsx files** atualizados para client components com DashboardHeader real:
   - `/dashboard/[tenant]/loading.tsx`
   - `/dashboard/[tenant]/pacientes/loading.tsx`
   - `/dashboard/[tenant]/pacientes/[patientId]/loading.tsx`
   - `/dashboard/[tenant]/atendimentos/loading.tsx`
   - `/dashboard/[tenant]/agenda/loading.tsx`

2. **AgendaSkeleton**: removido bloco de header skeleton duplicado

3. **PatientDetailPage**: refatorado com Suspense
   - Shell: await apenas `patient + latestMeasurement`
   - Body: `PatientBodyContent` (async server component) com 12 queries em Suspense

4. **PatientBodySkeleton**: novo skeleton para o corpo do prontuário

5. **`src/lib/performance/measure.ts`**: helper `measureAsync` + `measureSync`

## Pendências

- Dashboard page (`/dashboard/[tenant]/page.tsx`): 11 queries em Promise.all — pode ter Suspense granular por card em sprint futura
- Portal loading.tsx: pode receber DashboardHeader do portal em sprint futura
- ferramentas/loading.tsx: pode ser atualizado
- Instrumentação com `measureAsync` em services críticos
