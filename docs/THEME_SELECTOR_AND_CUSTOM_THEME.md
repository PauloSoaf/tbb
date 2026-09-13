# Theme Selector and Custom Theme

## Correcao tema claro NutriOpus - Azul & Bege

Data: 2026-07-05
Agente: Codex

### Problema

O tema claro havia removido o azul forte, mas passou a usar verde como identidade principal. A identidade correta do NutriOpus no tema claro e:

- Brand Navy: `#08284D`
- Brand Beige: `#D2AB85`

Verde deve ficar restrito a estados semanticos, como sucesso, saude, concluido e status positivo.

### Correcao

- Tema claro padrao agora usa fundo `#FBF8F4`, cards brancos, texto `#102033`, borda `#E6D9CC`, primary `#08284D` e accent `#D2AB85`.
- Sidebar clara usa `#F7EFE6`, item ativo navy com texto branco e hover bege `#EAD5C0`.
- Navbar clara usa fundo tokenizado com leve transparencia e blur.
- Tokens `primary`, `secondary`, `accent`, `muted`, `border`, `ring` e aliases `brand-navy/brand-beige` foram expostos no `@theme inline`.
- O nome `brand-blue` foi mantido por compatibilidade, mas no tema claro aponta para o navy da marca.
- `theme-clinical-leaf` permanece como id legado para nao quebrar `next-themes`, mas visualmente virou `Clinico Suave` sem verde primario.

## Temas disponiveis

- **Azul & Bege**: tema claro padrao, navy + bege + off-white.
- **Azul Escuro Premium**: dark mode com superficies navy e detalhes bege.
- **NutriOpus Claro**: variante branca/soft-blue com primary navy.
- **Clinico Suave**: variante leve com fundo azul acinzentado e primary navy 700.
- **Bege Minimalista**: variante quente com sidebar bege e primary navy.
- **Personalizado**: permite editar primary, accent, cor suave, navbar, sidebar e ativo da sidebar.

## Como funciona com next-themes

O `next-themes` continua gerenciando a classe do tema no elemento `<html>`.
Os ids legados continuam registrados:

- `light`
- `dark`
- `theme-nutri-blue`
- `theme-clinical-leaf`
- `theme-premium-sand`
- `theme-custom`

As cores reais sao resolvidas por variaveis CSS em `src/app/globals.css` e lidas pelo Tailwind v4 via `@theme inline`.

## Tokens principais

- `--primary`, `--primary-foreground`, `--primary-hover`, `--primary-subtle`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`, `--accent-hover`, `--accent-subtle`
- `--brand-navy`, `--brand-beige`
- `--brand-blue`, `--brand-blue-hover`, `--brand-blue-soft` (aliases de compatibilidade)
- `--navbar-background`, `--navbar-border`, `--navbar-accent`
- `--sidebar-background`, `--sidebar-accent`, `--sidebar-hover`
- `--tooltip-bg`, `--tooltip-foreground`, `--tooltip-border`

## Tema personalizado

O custom theme salva em `localStorage` com a key `nutriopus-custom-theme`.
O helper `custom-theme-utils.ts` injeta um `<style>` apenas quando o tema atual e `theme-custom`.

Presets do dialog:

- `NutriOpus Claro`
- `Azul & Bege`
- `Clinico Suave`
- `Azul Escuro Premium`
- `Bege Minimalista`

Compatibilidade:

- Configs antigas com `#3F7667`, `#4F8A5B` ou `soft-leaf` sao normalizadas para navy/bege.
- O preset padrao e `Azul & Bege`.

## i18n

O menu de tema usa as chaves:

- `theme.presets.*`
- `theme.groups.*`
- `theme.customize.*`
- `theme.preview.*`

PT/EN/ES precisam manter o mesmo contrato para evitar chave crua na UI.

## Arquivos principais

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

## Checklist anti-regressao

- Nao usar verde como primary, sidebar active, navbar accent ou CTA principal do tema claro.
- Verde permitido somente para sucesso/status clinico positivo.
- Nao reintroduzir `#2563EB` como primary claro.
- Botao principal claro: `#08284D` com hover `#0D3768`.
- Botao secundario claro: bege suave com texto navy.
- Dark mode precisa manter contraste suficiente em botao e texto.
