# Mapa de reaproveitamento

O bootstrap preservou somente infraestrutura genérica do snapshot NutriOpus: configuração Next/TypeScript, padrões de Prisma, autenticação, storage, layouts, modais, feedback de formulários e utilitários testáveis.

Foram reescritos identidade visual, navegação, domínio, schema, tenancy, rotas e conteúdo. Modelos e telas clínicas, portal de paciente, agenda clínica, prescrições, prontuários e integrações médicas não pertencem ao TBB e foram removidos.

O manifesto `snapshot-manifest.json` registra hashes do snapshot para auditoria. O projeto de origem permanece em outro diretório e não é escrito pelos scripts do TBB.
