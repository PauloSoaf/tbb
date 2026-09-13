# Demo Mode — Arquitetura de Dados

> Data: 2026-07-05

## Princípio

Uma única fonte de dados fictícios (`src/demo/demo-data.ts`) tipada com interfaces próprias (`DemoPatient`, `DemoMealPlan`, `DemoAppointment`, …) — **desacopladas dos tipos Prisma** de propósito: a demo nunca deve quebrar por mudança de schema, e o schema nunca deve se contorcer pela demo.

## Fluxo de estado

```
demo-data.ts (seed imutável)
      │  seedState()
      ▼
DemoProvider (src/demo/demo-context.tsx)
      │  useState + hydrate de localStorage (1x, client)
      ▼
páginas /demo/** (useDemo())
      │  ações locais: addWeight, addClinicalNote, toggleReminder,
      │  toggleShoppingItem, addDiaryEntry, sendMessage (auto-reply), resetDemo
      ▼
localStorage "nutriopus-demo-state-v1" (persistência entre visitas)
```

- Hidratação usa `queueMicrotask` (padrão do projeto para satisfazer `react-hooks/set-state-in-effect`).
- A persistência só começa **após** a hidratação, para o seed não sobrescrever o estado salvo.
- `resetDemo()` remove a chave e re-seeda em memória.

## Por que componentes demo próprios em vez de reutilizar as páginas reais

As páginas reais são Server Components acoplados a `assertTenantAccess` + Prisma, e os client components recebem shapes derivados do Prisma. Envolvê-los exigiria fabricar esses shapes inteiros e acompanhar cada mudança deles. A demo reproduz o **design system** (mesmos tokens: `bg-card-bg`, `border-border-neutral`, `text-text-primary`, `brand-blue`, `bg-surface-warm`, `rounded-3xl`) em componentes pequenos e autônomos (`DemoCard`, `DemoStat`, `DemoSparkline`), e reutiliza diretamente os componentes reais que são puros (ex.: `AppTooltip`) e as chaves i18n existentes (`nav.*`, `dashboard.*`, `meal_substitutions.*`, `patient_record.*`). Resultado: mesma cara, zero risco para o app real.

## Cobertura de dados

4 pacientes (perfis distintos: emagrecimento, pré-consulta, hipertrofia, pré-diabetes com alerta clínico), 5 meses de evolução de peso, 3+ avaliações antropométricas, plano alimentar completo (4 refeições, 12 itens, macros e substituições), 6 consultas (agendadas/concluídas, online/presencial), chat com histórico, lista de compras com 9 itens em 5 categorias, diário alimentar, metas com progresso, lembretes, notificações, anamnese resumida, excerto de transcrição, TACO amostral (10 alimentos) e medidas caseiras (6).
