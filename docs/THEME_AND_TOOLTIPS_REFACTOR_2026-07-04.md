# Theme And Tooltips Refactor

Data: 2026-07-04
Agente: Codex
Status: Implementado parcialmente

## Problema

O tema claro tinha leitura bege/azul forte e tooltips nativos variavam entre navegadores. O card "Revisadas" nao explicava o que estava contando.

## Causa encontrada

Os tokens globais claros usavam uma base quente dominante. `StatsCard` nao aceitava texto de ajuda e alguns controles usavam `title` nativo.

## Correcao aplicada

O tema claro padrao recebeu tokens navy/bege. O tema customizado passa a iniciar no preset `blue-beige`. Foi criado `AppTooltip` CSS-only e aplicado ao card de estatistica, toggle de tema, toggle de idioma e sino de notificacoes. O stat do dashboard virou "Anamneses revisadas" com tooltip.

## Arquivos alterados

- `src/app/globals.css`
- `src/components/ui/AppTooltip.tsx`
- `src/components/dashboard/StatsCard.tsx`
- `src/components/layout/ThemeToggle.tsx`
- `src/components/layout/LangToggle.tsx`
- `src/components/theme/custom-theme-utils.ts`
- `src/lib/i18n/pt.json`
- `src/lib/i18n/en.json`
- `src/lib/i18n/es.json`

## Testes executados

- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run lint` falhou por pendencias legadas.

## Resultado

Dashboard e header usam uma base visual mais neutra, com tooltip reutilizavel e labels de estatistica mais claros.

## Pendencias

Migrar tooltips nativos restantes em formularios e tabelas para `AppTooltip`.

## Correcao tema claro NutriOpus - Azul & Bege

Data: 2026-07-05
Agente: Codex

### Problema

O tema claro foi corrigido de azul royal para uma base verde, mas isso nao seguia a identidade real do NutriOpus. A identidade correta e azul escuro `#08284D` + bege `#D2AB85`; verde deve ficar apenas para sucesso/status positivo.

### Correcao

- Tema claro baseado em background `#FBF8F4`, cards `#FFFFFF`, borda `#E6D9CC`, texto `#102033`.
- Primary claro em `#08284D`, hover `#0D3768`, foreground branco.
- Accent/secondary em bege `#D2AB85`, `#F4E8DB`, `#EAD5C0`.
- Sidebar clara com fundo `#F7EFE6`, active navy e hover bege.
- Navbar clara com token `rgba(251, 248, 244, 0.92)` e `backdrop-blur`.
- Custom theme agora oferece os presets NutriOpus Claro, Azul & Bege, Clinico Suave, Azul Escuro Premium e Bege Minimalista.
- Login da nutricionista recebeu navbar com logo, idioma e tema, card branco e CTA navy.
- i18n PT/EN/ES do menu de tema foi revisado para evitar chaves cruas.

### Arquivos alterados

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/components/layout/ThemeToggle.tsx`
- `src/components/theme/CustomThemeDialog.tsx`
- `src/components/theme/custom-theme-utils.ts`
- `src/components/layout/DashboardHeader.tsx`
- `src/components/layout/DashboardSidebar.tsx`
- `src/components/patient-portal/layout/PatientPortalHeader.tsx`
- `src/components/patient-portal/layout/PatientPortalSidebar.tsx`
- `src/lib/i18n/pt.json`
- `src/lib/i18n/en.json`
- `src/lib/i18n/es.json`

### Testes

- `node` parse dos JSONs PT/EN/ES: passou.
- `npx tsc --noEmit --pretty false`: passou.
- `npx eslint` nos arquivos tocados de tema/login/shell: 0 erros. `globals.css` e ignorado pela config do ESLint.
- `npm run build`: passou depois de encerrar processos antigos do `next dev` que bloqueavam o `prisma generate`.
- `npm run test`: passou, 67 arquivos / 663 testes.
- `npm run lint`: falha por erros legados fora desta correcao (`require()` em scripts soltos, `any` em calculadoras, regras React Compiler em `PatientAIAssistantChat`).
- Dev server reiniciado em `http://localhost:3000`; `/login` HTTP 200 e `/portal/fabiola` HTTP 200.
- Rotas protegidas `/dashboard/fabiola*` retornaram HTTP 307 sem cookie de sessao no smoke HTTP, esperado.
- Screenshot automatizado nao executado porque Playwright nao esta instalado no projeto.
