# Demo Mode — Reutilização do app real

Data: 2026-07-05 (correção aplicada em 2026-07-07)
Agente: Claude (Fable)

## Problema

A primeira demo criou uma UI paralela (shell próprio, nav horizontal própria, cards próprios). Parecia outro produto — não servia como demonstração do NutriOpus.

## Decisão

A demo reutiliza o **shell real, sidebar real, navbar real e page-clients reais**, trocando apenas dados e actions por mocks. A única UI própria da demo é a barra fina "DEMO" acima do shell.

## Peça-chave: rotas-ponte

Os componentes reais montam links como `/dashboard/{tenant}/...`. Com `tenant="demo"`, esses links apontam para `/dashboard/demo/...`. Como **segmento estático vence dinâmico** no App Router, existem duas pontes fora do layout autenticado:

- `src/app/dashboard/demo/[[...rest]]/page.tsx` → redireciona para `/demo/dashboard/...`
- `src/app/portal/demo/[[...rest]]/page.tsx` → redireciona para `/demo/portal/...` (inclusive tratando o prefixo `/paciente/{slug}` do rewrite do portal)

Resultado: **nenhum componente real precisou ser alterado** — sidebar, header, cards e botões continuam gerando os links de sempre, e a navegação volta sozinha para dentro da demo. Rotas sem equivalente demo caem no home da demo (nunca 404, nunca tela de login).

## Mantido da demo anterior

Banner DEMO (agora `DemoTopBanner`, acima do shell real), switch nutricionista/paciente, resetar/sair, `demo-data.ts`, `demo-context.tsx` (estado + localStorage), `demo-routes.ts`, `demo-feature-flags.ts`, e os helpers visuais internos `DemoUi` (usados apenas nas subtelas secundárias).

## Removido

`DemoShell.tsx` (shell fake com nav horizontal própria) e todas as páginas que renderizavam dashboard/pacientes/agenda/atendimentos/ferramentas com HTML próprio.

## Arquitetura

```
Página real:  page.tsx (auth+Prisma) ──dados reais──▶ PageClient real
Página demo:  page.tsx (client)     ──adapter+mock──▶ MESMO PageClient real
```

## Componentes reais reutilizados

- Shell dashboard: `DashboardSidebar`, `MobileBottomNav` (mesma estrutura do layout real)
- Shell portal: `PatientPortalShell` (→ Sidebar/Header/MobileNav/ProfileDropdown reais)
- Páginas: `DashboardPageClient`, `PacientesPageClient`, `AgendaPageClient`, `AtendimentosPageClient`, `FerramentasPageClient`
- Prontuário: `DashboardHeader`, `PatientStickyHeader`, `PatientRecordPageLayout` (grid 3 colunas real com a action sidebar real), `PatientClinicalAside`
- Adapters em `src/demo/adapters/` convertem o mock para o shape EXATO que esses componentes esperam (a demo se adapta ao contrato real, nunca o contrário)

## Tema e idioma

Nenhum tema forçado: a demo herda `ThemeProvider`/`I18nProvider` globais — claro/escuro e PT/EN/ES idênticos ao app real.

## Limitações conhecidas

- Call nativa bloqueada (sem WebRTC/SSE/WS na demo).
- `FloatingActionDock` (assistente IA) omitido do shell demo — o drawer chama actions reais.
- Interações dos page-clients reais que disparam server actions reais (ex.: criar consulta pela agenda) retornam erro de auth tratado (toast) — mutações demo de verdade existem nas telas com widgets demo (nota clínica, lembretes, peso, diário, compras, chat).

## Verificação (2026-07-07)

tsc 0 erros · eslint limpo · `next build` OK (16 rotas demo + 2 pontes) · 663/663 testes · varredura de imports proibidos em `src/app/demo`/`src/demo`: limpa (zero Prisma/actions/services/cookies).
