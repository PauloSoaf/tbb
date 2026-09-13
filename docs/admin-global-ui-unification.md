# Unificação Visual do Admin Global

Data: 2026-07-19

## Problema encontrado

`/admin/*` (Global SaaS Admin) tinha um shell inteiramente próprio, construído do
zero em `src/app/admin/layout.tsx`: sidebar fixa de 64px sem tokens de tema
(`bg-card-bg` em vez de `var(--sidebar-*)`), sem logo NutriOpus, sem drawer
mobile, sem colapso, sem `LangToggle`/`ThemeToggle`, header próprio de 64px sem
`ProfileDropdown`, e todos os textos hardcoded em português. O conteúdo das
páginas (`/admin`, `/admin/tenants`, `/admin/planos`, `/admin/auditoria`) já
usava majoritariamente os tokens certos (`bg-card-bg`, `border-border-neutral`,
`text-text-primary/secondary`, `rounded-2xl`), então a quebra visual era quase
inteiramente do shell (sidebar + navbar), não do conteúdo.

## Rotas ajustadas

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/tenants/page.tsx`
- `src/app/admin/planos/page.tsx`
- `src/app/admin/auditoria/page.tsx`

## Componentes reutilizados (não duplicados)

- `DashboardSidebar` (`src/components/layout/DashboardSidebar.tsx`) — em vez de
  criar uma sidebar nova, ela ganhou três props opcionais (`items`, `badge`,
  `footer`) com defaults que preservam 100% o comportamento atual do dashboard
  do tenant. Nenhum call-site existente (`dashboard/[tenant]/layout.tsx`) foi
  alterado ou quebrado — continua chamando `<DashboardSidebar tenantSlug
  nutritionistName />` sem os novos props.
- `DashboardHeader` (`src/components/layout/DashboardHeader.tsx`) — ganhou
  `badge` (pill ao lado do título) e `showNotifications` (default `true`,
  admin passa `false` porque o sino é de notificações clínicas do tenant).
- `ProfileDropdown`, `LangToggle`, `ThemeToggle` — reaproveitados sem alteração.
- `useConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) — substituiu
  `window.confirm()` na troca rápida de plano em `TenantsAdminClient`.

## Componentes criados

- `src/components/admin/AdminSidebar.tsx` — client component fino que monta o
  array de itens do menu admin (Visão Geral, Clínicas, Planos, Auditoria) via
  `useI18n()` e delega toda a renderização/estado para `DashboardSidebar`.
- `src/components/admin/AdminBadges.tsx` — `GlobalAdminBadge`,
  `SystemStatusBadge`, `AdminHeaderBadges` (composição dos dois).
- `src/components/admin/AdminPageHeader.tsx` — wrapper fino sobre
  `DashboardHeader` que resolve `titleKey`/`subtitleKey` via i18n e injeta o
  badge do admin; usado por todas as 4 páginas admin.
- `src/components/admin/AdminBackToDashboardLink.tsx` — link "voltar ao meu
  dashboard" no rodapé da sidebar, i18n'd.

## Componentes/código removidos

- A sidebar e o header hardcoded que viviam inline em `admin/layout.tsx`
  (~80 linhas de JSX duplicado) foram removidos por completo.
- `window.confirm()` em `TenantsAdminClient.handleChangePlan`.

## Chaves i18n adicionadas (pt-BR, en, es)

Namespace `admin` novo em `src/lib/i18n/{pt,en,es}.json`: `admin.global.*`,
`admin.nav.*` (overview, tenants, plans, audit, sessions, securityEvents —
as duas últimas reservadas para quando as rotas `/admin/sessoes` e
`/admin/eventos-seguranca` existirem — e `backToDashboard`), `admin.tenants.*`
(título, descrição, busca, colunas da tabela, paginação, empty state, textos
de confirmação/toast da troca de plano), `admin.plans.*`, `admin.audit.*` e
`admin.system.*` (operational/partial/offline).

Os textos dos KPI cards da Visão Geral e do catálogo de planos (`admin/page.tsx`,
`admin/planos/page.tsx`) **não** foram movidos para i18n nesta sprint — não
estavam na lista de chaves obrigatórias e o escopo já era grande; ficou
registrado como pendência abaixo.

## Como testar o layout admin

1. Logar com uma conta `GLOBAL_ADMIN` (ver seção seguinte).
2. Acessar `/admin`, `/admin/tenants`, `/admin/planos`, `/admin/auditoria` — a
   sidebar e a navbar devem ser visualmente idênticas ao dashboard do
   tenant (mesma logo, mesmos tokens de cor, mesmo hover/active state), só
   trocando os itens do menu e o badge "Global Admin".
3. Colapsar/expandir a sidebar (botão do chevron) — mesmo comportamento e
   persistência em `localStorage` do dashboard normal.
4. Redimensionar para mobile — sidebar vira drawer com overlay, igual ao
   dashboard normal.
5. Trocar tema (claro/escuro) e idioma (pt/en/es) pelo `ThemeToggle`/`LangToggle`
   no header — sidebar, badges e textos da tabela de tenants devem responder.
6. Em `/admin/tenants`: buscar, filtrar por plano, trocar o plano de um tenant
   (deve abrir o `ConfirmDialog` do design system, não um `window.confirm`
   nativo) e paginar.
7. Zerar os resultados da busca (ex.: buscar por um texto inexistente) para
   ver o empty state novo.

## Como validar permissões de `GLOBAL_ADMIN`

- Logado como usuário comum (`NUTRITIONIST`/`OWNER` sem `role=GLOBAL_ADMIN`):
  acessar `/admin` deve resultar em redirecionamento/403 via
  `requireGlobalAdmin()` (`src/lib/tenancy/requirePermission.ts`) — inalterado
  nesta sprint.
- Logado como `GLOBAL_ADMIN`: acesso normal a todas as rotas `/admin/*`.
- Ver `docs/admin-global-guide.md` para como promover uma conta a
  `GLOBAL_ADMIN` via `prisma/seed-permissions.ts`.

## Comandos executados

```bash
npx tsc --noEmit
npx eslint src/app/admin/ src/components/admin/ src/components/layout/DashboardSidebar.tsx src/components/layout/DashboardHeader.tsx
```

Resultado: `tsc` sem erros. `eslint` sem erros/warnings nos arquivos tocados
por esta sprint — os 7 erros de `no-explicit-any` restantes em
`src/components/admin/GlobalAdminCharts.tsx` são pré-existentes (arquivo não
tocado nesta sprint, fora de escopo).

`npm run build` não foi reexecutado nesta sessão porque havia um `next dev`
local ativo (trava o `prisma generate` no Windows, problema documentado em
`docs/CARE_SESSION_SIGNALING_PRODUCTION_DEPLOY.md`). Recomenda-se rodar
`npm run build` antes do merge.

## Pontos pendentes

1. **KPIs da Visão Geral e cards do catálogo de Planos** ainda têm texto
   hardcoded em pt-BR (não estavam na lista de chaves i18n obrigatórias desta
   sprint).
2. **Skeleton de carregamento inicial**: as páginas admin são Server
   Components com fetch direto — não há `loading.tsx` em `src/app/admin/`
   ainda. O `isPending`/spinner do `TenantsAdminClient` cobre buscas e trocas
   de página, mas o primeiro carregamento SSR não tem skeleton dedicado.
3. **`/admin/sessoes` e `/admin/eventos-seguranca`**: chaves i18n
   (`admin.nav.sessions`, `admin.nav.securityEvents`) já existem, mas as rotas
   e os itens de menu correspondentes não foram criados — não existiam antes
   desta sprint e criar as telas está fora do escopo "só unificação visual".
4. **`GlobalAdminCharts.tsx`**: 7 erros de lint pré-existentes (`any` em
   tooltips do Recharts), não tocados por não fazerem parte do escopo desta
   sprint.
5. Sprints 5.1 (Hardening), 6 (métricas avançadas) e 7 (Assinaturas/Billing)
   do `docs/roadmap-hardening-admin-billing.md` continuam **planejadas, não
   implementadas**.
