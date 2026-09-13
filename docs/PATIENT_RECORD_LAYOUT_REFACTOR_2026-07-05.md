# Patient Record Layout Refactor

Data: 2026-07-05
Agente: Claude (Sonnet)

## Problema

A sidebar direita da tela do paciente (`PatientClinicalSidebar`) era um rail que expandia via `onMouseEnter`/`onMouseLeave` para `w-full` dentro de uma coluna `lg:sticky`. Combinado com a página usando `max-w-6xl mx-auto` (container estreito) e `grid-cols-12` (coluna direita de apenas 4/12), o resultado percebido era de um painel flutuante instável: expandia/recolhia ao menor movimento do mouse, sticky fazia parecer "flutuar" por cima do conteúdo ao rolar, e os botões recolhidos ficavam espremidos em 56px de largura dentro de uma coluna já apertada.

Pior: a mesma lista de atalhos (Ficha, Planos, Avaliações, Adipômetro, Arquivos, Consultas, Anamneses, Diário, Chat) e os mesmos botões (reenviar link do portal, exportar dados, exportar CSV) apareciam **duas vezes** na tela — uma vez dentro do rail (`PatientClinicalSidebar`, seção "Dados"/"Portal e exportação") e de novo no card "Relatórios e Dados" no fim da coluna de sidebar.

## Decisão

Substituir por um **grid CSS real de 3 colunas nomeadas** (`main` / `aside` / `rail`), onde a largura de cada coluna é controlada pelo `grid-template-columns`/`grid-template-areas` do container pai — nunca por `position: fixed/absolute` do componente da sidebar. Expandir a action rail cresce sua própria trilha do grid e encolhe a trilha da coluna clínica ao lado — empurra o conteúdo, nunca cobre.

Estado de expandido/recolhido é explícito (clique num botão, não hover) e persistido em `localStorage`, seguindo o padrão já usado em `DashboardSidebar.tsx` (`queueMicrotask` para satisfazer a regra de lint `react-hooks/set-state-in-effect`).

## Layout

```
┌────────────┬─────────────────────────┬──────────────────┬────────────┐
│ Sidebar    │ main (prontuário/       │ aside (clínico:  │ rail       │
│ esquerda   │ timeline/composer)      │ metas/lembretes/ │ (ações     │
│ do app     │                         │ evolução/etc)    │ rápidas)   │
└────────────┴─────────────────────────┴──────────────────┴────────────┘
```

- **main**: `PatientProntuarioComposer`, `QuickNoteInput`, `ProntuarioTimeline` (inalterados, só realocados).
- **aside** (`PatientClinicalAside`): metas, lembretes, tags, planos recentes, lista de compras, próxima consulta, contato + WhatsApp, conta do portal, alerta clínico, sparklines, comparativo inicial→atual, check-ins de bem-estar. Wrapper puramente de apresentação (sticky + scroll no desktop), sem estado — continua Server Component.
- **rail** (`PatientActionSidebar`): ações rápidas, relatórios/dados, comunicação, portal/exportação. Único lugar onde esses atalhos existem agora — **o card duplicado "Relatórios e Dados" foi removido inteiramente da página**.

## Responsividade (via `grid-template-areas` por breakpoint, mesmo elemento, sem duplicar montagem)

- **< lg (< 1024px)**: 1 coluna — main → aside → rail (rail vira toolbar horizontal com scroll, ícones apenas).
- **lg (1024–1279px)**: 2 colunas reais (main + rail recolhido 76px); aside ocupa a linha de baixo, largura total.
- **xl+ (≥ 1280px)**: 3 colunas reais lado a lado. O botão de expandir/recolher da rail só tem efeito aqui — cresce para ~300-340px (2xl) e encolhe a coluna do aside proporcionalmente, sem sobrepor nada.

A troca de `grid-template-areas` reposiciona os MESMOS nós React (não há duplicação de montagem) — evita re-render/refetch duplicado de componentes com estado interno como `GoalsPanel`/`TagManager`.

## Floating tools

`FloatingActionDock` é `position: fixed` no canto inferior direito da viewport — como a nova rail é uma coluna real (não overlay), em telas largas ela pode terminar perto do canto onde o dock flutua. Resolvido com CSS puro (`globals.css`), sem plumbing de contexto: a rail marca `data-patient-action-rail="collapsed|expanded"` em sua raiz; uma regra `body:has([data-patient-action-rail]) .floating-action-dock { right: ... }` desloca o dock para a esquerda quando a rail está presente (e mais ainda quando expandida), só a partir de `xl:` (abaixo disso a rail não é mais uma coluna lateral).

## Arquivos alterados

- **Criados**:
  - `src/components/patient-record/PatientRecordPageLayout.tsx` — grid real + estado persistido de expansão.
  - `src/components/patient-record/PatientActionSidebar.tsx` — rail/toolbar responsivo, controlado externamente.
  - `src/components/patient-record/PatientClinicalAside.tsx` — wrapper de apresentação da coluna clínica.
- **Removido**: `src/components/patients/PatientClinicalSidebar.tsx` (superseded).
- **Modificado**: `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx` (usa o novo layout, remove `max-w-6xl`/`grid-cols-12`, remove o card duplicado "Relatórios e Dados", remove prop `patientSlug` não mais usada em `PatientBodyContent`).
- **Modificado**: `src/components/floating-assistant/FloatingActionDock.tsx` (classe `.floating-action-dock` para o seletor CSS).
- **Modificado**: `src/app/globals.css` (regra `:has()` de reposicionamento).
- **Modificado**: `src/lib/i18n/{pt,en,es}.json` (namespace `patient_record.sidebar.*` e `patient_record.aside.*`, 30+chaves × 3 idiomas).

## Testes

- `npx tsc --noEmit`: **0 erros**.
- `npx eslint` nos arquivos alterados: **limpo** (corrigido 1 erro `react-hooks/set-state-in-effect` usando o padrão `queueMicrotask` já estabelecido em `DashboardSidebar.tsx`).
- `npx vitest run`: **663/663 testes passando** (suíte completa, nenhuma regressão).
- `npx next build`: **build completo sem erros** (o `prisma generate` no mesmo comando falhou por lock de DLL do Windows — processo `node` já rodando prendia `query_engine-windows.dll.node`; ambiente pré-existente documentado no projeto, não relacionado a esta mudança; o build do Next em si, rodado isoladamente com o client Prisma já existente, completou com sucesso e sem erros).

## Testes manuais recomendados (não executados neste ambiente headless)

- `/dashboard/fabiola/pacientes/<slug-real>` em desktop largo, desktop médio (zoom 125%), mobile, com scroll — conferir que a rail nunca cobre `aside`/`main`, que expandir empurra o layout, e que o dock flutuante se desloca corretamente.
