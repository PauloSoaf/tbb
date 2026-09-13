# TBB — To Be Better

TBB é um workspace pessoal para organizar hábitos, tarefas, projetos, metas, finanças e carreira. A tela **Today** reúne o que pede ação agora; **Insights** e **Weekly Review** transformam os mesmos dados reais em contexto.

## Stack

- Next.js 16.2.7, React 19 e TypeScript
- PostgreSQL e Prisma
- TanStack Table v9 para a planilha financeira
- Bklit UI/Visx para analytics
- Zod, Vitest e ESLint
- Sessões opacas persistentes, RBAC por workspace e storage privado

## Desenvolvimento local

```bash
npm install
npm run setup:local
docker compose up -d
npm run prisma:deploy
npm run dev
```

O setup cria um `.env` exclusivo do TBB. O PostgreSQL local usa a porta `5440` e volume próprio. Acesse `http://localhost:3000` e crie sua conta em `/register`.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx prisma migrate status
```

## Módulos

- Life: Habits, Tasks, Projects, Goals e Calendar
- Money: Overview, Transactions, Accounts, Budgets, Subscriptions, Debts, Savings, Reports e Imports
- Career: pipeline, empresas, entrevistas, contatos e documentos
- Today, Insights, Weekly Review, Integrations, Settings e Admin

A grade financeira aceita edição inline e clipboard TSV/CSV. Importações CSV e PDF passam por staging, mapeamento, validação, regras, deduplicação e confirmação. Drafts nunca alteram analytics antes de serem salvos.

## Documentação

Consulte [`docs/tbb`](docs/tbb) para arquitetura, modelo de dados, módulos, design, migração de domínio, import engine, integrações e roadmap.

Este repositório é independente do NutriOpus. A origem foi usada somente como snapshot inicial; credenciais, uploads, banco, containers e histórico operacional não são compartilhados.
