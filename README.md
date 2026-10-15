# TBB — To Be Better

TBB é um workspace pessoal para organizar hábitos, tarefas, projetos, metas, finanças e carreira. A tela **Today** reúne o que pede ação agora; **Insights** e **Weekly Review** transformam os mesmos dados reais em contexto.

## Stack

- Next.js 16.2.7, React 19 e TypeScript
- PostgreSQL e Prisma
- TanStack Table v9 para a planilha financeira
- Bklit UI/Visx para analytics
- OpenAI Responses API opcional para captura estruturada e pesquisa web pelo assistente
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

Ao atualizar código que altera o schema Prisma, pare o servidor de desenvolvimento e sincronize o banco e o client antes de iniciar novamente:

```bash
npm run prisma:deploy
npm run prisma:generate
npm run dev
```

Uma mensagem como `The column ... does not exist in the current database` indica uma migration pendente. `prisma:deploy` aplica as migrations existentes; `npx prisma migrate status` confirma a sincronização. No Windows, parar o servidor antes de gerar o client também libera o arquivo da engine do Prisma.

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

O Finance também interpreta texto livre e mensagens copiadas do WhatsApp. Configure `OPENAI_API_KEY` para usar Structured Outputs do GPT; sem a chave, os exemplos simples continuam funcionando com o parser local. `OPENAI_FINANCE_MODEL` e `OPENAI_ASSISTANT_MODEL` permitem fixar os modelos. A busca web só é acionada pelo assistente quando o pedido contém uma intenção explícita de pesquisar informação atual.

## Documentação

Consulte [`docs/tbb`](docs/tbb) para arquitetura, modelo de dados, módulos, design, migração de domínio, import engine, integrações e roadmap.

O planejamento financeiro, os dois gráficos de salário e os gastos fixos estão descritos em [Visão geral financeira](docs/tbb/FINANCE_OVERVIEW.md). O [modo privado](docs/tbb/FINANCE_PRIVACY.md) protege valores e gráficos, com revelação por hover ou foco. O [simulador de crédito](docs/tbb/LOAN_SIMULATOR.md) compara cenários sem criar dívidas.

Este repositório é independente do NutriOpus. A origem foi usada somente como snapshot inicial; credenciais, uploads, banco, containers e histórico operacional não são compartilhados.
