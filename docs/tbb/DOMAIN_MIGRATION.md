# Migração de domínio

O TBB não migra dados clínicos. A estratégia foi criar um banco novo, uma baseline Prisma própria e modelos de workspace pessoal.

Correspondências reaproveitáveis foram conceituais: tenant virou Workspace; usuário e membership foram mantidos como infraestrutura; registros de auditoria viraram ActivityEvent; storage ganhou finalidades do TBB. Não existem aliases ou foreign keys para tabelas clínicas.

Para ambientes existentes, aplique somente as migrations deste repositório com `prisma migrate deploy`. Nunca aponte `DATABASE_URL` para a base NutriOpus.
