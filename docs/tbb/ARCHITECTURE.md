# Arquitetura

TBB e NutriOpus são produtos independentes construídos sobre a mesma família de produtos. Eles compartilham padrões de interação, linguagem de design, componentes fundamentais e convenções de engenharia, enquanto mantêm domínios, repositórios, bancos de dados e roadmaps completamente independentes.

> TBB and NutriOpus are independent products built on the same product family. They share interaction patterns, design language, foundational components and engineering conventions, while maintaining completely independent domains, repositories, databases and roadmaps.

TBB usa Next.js App Router. Server Components fazem leitura direta com Prisma; Server Actions concentram mutações e revalidam as superfícies dependentes. Componentes cliente existem para interação local, como a grade, modais, command palette e gráficos.

Toda entidade de produto pertence a `workspaceId`. `getWorkspaceContext` resolve usuário, membership e workspace da sessão. `requirePermission` aplica RBAC e overrides antes de mutações. Queries e updates incluem o workspace no predicado para impedir acesso cruzado.

Sessões usam token opaco em cookie `httpOnly`; somente o hash fica no banco. Arquivos passam pelo provider de storage e pela rota autenticada `/api/files/[id]`.

Os domínios vivem em `src/features`: habits, life, finance, career, insights, integrations e settings. UI compartilhada fica em `src/components`; analytics Bklit fica em `src/components/charts`, com wrappers de produto em `TbbCharts.tsx`.

ActivityEvent registra fatos úteis para timeline, auditoria funcional, Today e reviews. Ele não é usado como event sourcing.
