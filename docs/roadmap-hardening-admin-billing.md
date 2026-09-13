# Documento de Sprint: Hardening, Admin Global e Assinaturas do NutriOpus

## 1. Contexto geral

O NutriOpus está entrando em uma fase de maturidade SaaS. As fases de Segurança, RBAC, LGPD, Auditoria e Sessões já criaram a base estrutural para controle de acesso, governança de equipe e rastreabilidade. Agora as próximas sprints precisam validar essa base em fluxo real, consolidar o painel administrativo global e preparar a monetização por planos.

O projeto deve continuar seguindo a arquitetura já usada no NutriOpus:

| Área           | Padrão esperado                                            |
| -------------- | ---------------------------------------------------------- |
| Framework      | Next.js App Router                                         |
| Linguagem      | TypeScript                                                 |
| Banco          | PostgreSQL com Prisma                                      |
| Deploy         | Vercel                                                     |
| UI             | Tailwind, tema NutriOpus, navy escuro e bege               |
| Validação      | Zod                                                        |
| Renderização   | SSR e Server Components quando possível                    |
| Interatividade | Client Components isolados                                 |
| Segurança      | Tenant context, RBAC, Server Actions protegidas            |
| LGPD           | Minimização de dados, auditoria sanitizada e consentimento |
| Documentação   | `docs` ou `collab-reports`                                 |

O App Router do Next.js organiza o projeto por rotas, layouts e Server/Client Components, então as próximas sprints devem preservar SSR onde o dado inicial pode ser carregado no servidor e usar Client Components apenas para filtros, modais, toggles, formulários e ações interativas.

Como o sistema manipula dados de saúde, deve tratar esses dados como sensíveis. A LGPD considera dado referente à saúde como dado pessoal sensível, e a ANPD recomenda medidas administrativas e técnicas de segurança para agentes de tratamento de pequeno porte.

## 2. Sprints cobertas neste documento

| Sprint     | Nome                                    | Objetivo                                                                         |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------|
| Sprint 5.1 | Hardening de Segurança e Validação Real  | Provar que RBAC, tenant isolation, auditoria e sessão funcionam em fluxo real    |
| Sprint 6   | Dashboard Admin Global                   | Dar ao administrador global visão do SaaS sem expor dados clínicos sensíveis     |
| Sprint 7   | Assinaturas, Planos e Limites            | Preparar monetização, planos, trial, limites e controle de acesso por assinatura |

## 3. Princípios obrigatórios

1. Segurança server-side é obrigatória. O componente `<Can>` pode esconder botões, mas não pode ser a única barreira.
2. Toda query sensível deve validar tenant.
3. Toda mutation sensível deve validar autenticação, tenant, permissão e ownership.
4. Audit logs devem registrar metadados, não conteúdo clínico.
5. Admin global deve ver métricas agregadas, não prontuário, anamnese ou medidas individuais.
6. Toda tela nova deve usar i18n.
7. Toda tela nova deve usar tema do NutriOpus.
8. Toda tela nova deve ter loading, empty state e erro controlado.
9. Server Components devem ser usados para dados iniciais.
10. Client Components devem ficar isolados em filtros, modais, tabelas interativas e ações.

A recomendação de logging segue a linha do OWASP: logs são essenciais para segurança e investigação, mas dados sensíveis, credenciais, tokens e informações excessivas não devem ser registrados.

# Sprint 5.1: Hardening de Segurança e Validação Real

## 4. Objetivo da Sprint 5.1

Validar se a arquitetura de segurança realmente funciona fora do "caminho feliz". Essa sprint deve quebrar tentativas indevidas de acesso, confirmar que permissões bloqueiam Server Actions, garantir que sessões revogadas deixam de funcionar e provar que logs não armazenam dados clínicos sensíveis.

## 5. Requisitos da Sprint 5.1

| ID        | Requisito                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------|
| RQ-5.1-01 | O sistema deve bloquear acesso de usuário de um tenant a qualquer recurso de outro tenant                 |
| RQ-5.1-02 | O sistema deve validar tenant em pacientes, anamneses, antropometrias, prontuários, atendimentos e planos |
| RQ-5.1-03 | O sistema deve bloquear Server Actions quando o usuário não possuir permissão                             |
| RQ-5.1-04 | O sistema deve registrar audit log para criação, edição, arquivamento e exclusão de paciente              |
| RQ-5.1-05 | O sistema deve registrar audit log para acesso negado                                                     |
| RQ-5.1-06 | O sistema deve registrar audit log para alteração de permissões                                           |
| RQ-5.1-07 | O sistema deve mascarar ou remover dados clínicos sensíveis dos logs                                      |
| RQ-5.1-08 | O sistema deve permitir revogar sessão ativa                                                              |
| RQ-5.1-09 | Sessão revogada não deve continuar acessando o sistema                                                    |
| RQ-5.1-10 | Assistente e secretária devem ter acesso limitado por padrão                                              |
| RQ-5.1-11 | Permissões customizadas ALLOW e DENY devem prevalecer sobre o papel padrão                                |
| RQ-5.1-12 | Build, typecheck e lint devem ser executados e documentados                                               |

## 6. Especificações técnicas da Sprint 5.1

| ID         | Especificação                                                                       |
| ---------- | -------------------------------------------------------------------------------------|
| ESP-5.1-01 | Revisar todas as Server Actions sensíveis e garantir chamada de `requirePermission` |
| ESP-5.1-02 | Revisar queries por `tenantId` em repositories, services e actions                  |
| ESP-5.1-03 | Criar testes manuais documentados para tenant A versus tenant B                     |
| ESP-5.1-04 | Criar ou revisar helper `assertTenantOwnership`                                     |
| ESP-5.1-05 | Garantir que erros de permissão não revelem existência de recurso de outro tenant   |
| ESP-5.1-06 | Padronizar nomes de eventos de auditoria com formato `resource.action`              |
| ESP-5.1-07 | Criar sanitizador central para metadata de audit log                                |
| ESP-5.1-08 | Verificar se `session.status = REVOKED` invalida autenticação em request futuro     |
| ESP-5.1-09 | Usar throttling para atualização de `lastSeenAt`                                    |
| ESP-5.1-10 | Revisar UI de equipe após troca de permissões                                       |
| ESP-5.1-11 | Validar que `<Can>` não substitui proteção server-side                              |
| ESP-5.1-12 | Atualizar documentação com matriz de permissões testada                             |

## 7. Features da Sprint 5.1

| ID        | Feature                                                  |
| --------- | ----------------------------------------------------------|
| FT-5.1-01 | Checklist visual ou documental de validação multi-tenant |
| FT-5.1-02 | Teste manual de acesso cruzado entre tenants             |
| FT-5.1-03 | Padronização de eventos de auditoria                     |
| FT-5.1-04 | Auditoria de acesso negado                               |
| FT-5.1-05 | Auditoria de alteração de permissões                     |
| FT-5.1-06 | Auditoria de revogação de sessão                         |
| FT-5.1-07 | Sanitização reforçada de metadata                        |
| FT-5.1-08 | Validação real de sessão revogada                        |
| FT-5.1-09 | Correção de qualquer tela quebrada por RBAC              |
| FT-5.1-10 | Validação de permissões por papel                        |
| FT-5.1-11 | Documentação de bugs encontrados                         |
| FT-5.1-12 | Relatório final da sprint com comandos executados        |

## 8. Histórias de usuário da Sprint 5.1

| ID        | História                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------|
| US-5.1-01 | Como dona da clínica, quero ter certeza de que ninguém de outra clínica acessa meus pacientes    |
| US-5.1-02 | Como assistente, não devo conseguir acessar prontuários se essa permissão não foi concedida      |
| US-5.1-03 | Como secretária, quero acessar agenda e dados básicos sem ver dados clínicos sensíveis           |
| US-5.1-04 | Como nutricionista, quero saber quando alguém tentou acessar algo sem permissão                  |
| US-5.1-05 | Como dona da clínica, quero revogar uma sessão suspeita de um membro da equipe                   |
| US-5.1-06 | Como admin técnico, quero confirmar que a sessão revogada não continua válida                    |
| US-5.1-07 | Como responsável pelo sistema, quero logs úteis sem vazar prontuário ou anamnese                 |
| US-5.1-08 | Como desenvolvedor, quero um padrão único de nomes de eventos                                    |
| US-5.1-09 | Como auditor, quero rastrear quem alterou permissões de um colaborador                           |
| US-5.1-10 | Como owner, quero validar permissões customizadas por membro                                     |
| US-5.1-11 | Como usuário sem permissão, quero receber mensagem amigável de acesso negado                     |
| US-5.1-12 | Como mantenedor, quero documentação clara de tudo que foi testado                                |

## 9. Critérios de aceite da Sprint 5.1

1. Usuário de tenant A não acessa dados de tenant B.
2. Server Actions bloqueiam usuários sem permissão.
3. `<Can>` é apenas camada visual.
4. Logs registram sucesso, falha e acesso negado.
5. Logs não armazenam conteúdo clínico bruto.
6. Sessão revogada deixa de funcionar.
7. Assistente e secretária não têm acesso total por padrão.
8. Overrides ALLOW e DENY funcionam.
9. Navbar e sidebar continuam funcionando.
10. `npx tsc --noEmit`, lint e build foram executados ou tiveram falha documentada.

# Sprint 6: Dashboard Admin Global

## 10. Objetivo da Sprint 6

Criar uma visão administrativa global para o dono do SaaS acompanhar operação, uso, crescimento, segurança e assinatura futura do NutriOpus sem acessar dados clínicos individuais.

O admin global deve ver dados agregados. Ele pode saber que uma clínica possui 40 pacientes, 12 anamneses e 3 membros, mas não deve abrir prontuário, respostas de anamnese, medidas antropométricas ou plano individual.

## 11. Requisitos da Sprint 6

| ID      | Requisito                                                         |
| ------- | -------------------------------------------------------------------|
| RQ-6-01 | O sistema deve possuir rota global protegida para admin           |
| RQ-6-02 | Apenas usuários `GLOBAL_ADMIN` devem acessar `/admin`             |
| RQ-6-03 | O dashboard deve mostrar total de tenants                         |
| RQ-6-04 | O dashboard deve mostrar tenants ativos e inativos                |
| RQ-6-05 | O dashboard deve mostrar total de nutricionistas                  |
| RQ-6-06 | O dashboard deve mostrar total agregado de pacientes              |
| RQ-6-07 | O dashboard deve mostrar média de pacientes por nutricionista     |
| RQ-6-08 | O dashboard deve mostrar sessões ativas                           |
| RQ-6-09 | O dashboard deve mostrar logins por período                       |
| RQ-6-10 | O dashboard deve mostrar ações sensíveis agregadas                |
| RQ-6-11 | O dashboard deve mostrar acessos negados                          |
| RQ-6-12 | O dashboard não deve mostrar dados clínicos individuais           |
| RQ-6-13 | O dashboard deve preparar espaço para MRR, trial e planos         |
| RQ-6-14 | Todas as telas admin devem reutilizar o shell visual do NutriOpus |

## 12. Especificações técnicas da Sprint 6

| ID       | Especificação                                                               |
| -------- | ------------------------------------------------------------------------------|
| ESP-6-01 | Criar ou consolidar `AdminShell` reutilizando navbar e sidebar do dashboard |
| ESP-6-02 | Proteger layout `/admin` com `requireGlobalAdmin()`                         |
| ESP-6-03 | Buscar métricas agregadas em Server Components ou services server-side      |
| ESP-6-04 | Criar `adminMetrics.service.ts` para centralizar queries                    |
| ESP-6-05 | Criar `adminTenant.service.ts` para listagem e filtros de tenants           |
| ESP-6-06 | Criar paginação server-side na listagem de tenants                          |
| ESP-6-07 | Criar filtros por plano, status e busca textual                             |
| ESP-6-08 | Criar cards de métricas com skeleton                                        |
| ESP-6-09 | Criar tabela de tenants sem dados clínicos sensíveis                        |
| ESP-6-10 | Criar gráficos de crescimento com dados agregados                           |
| ESP-6-11 | Criar logs de acesso do próprio admin global                                |
| ESP-6-12 | Usar i18n para todos os textos                                              |
| ESP-6-13 | Manter responsividade desktop, notebook e tablet                            |
| ESP-6-14 | Documentar quais dados o admin pode e não pode ver                          |

## 13. Features da Sprint 6

| ID      | Feature                                                    |
| ------- | -------------------------------------------------------------|
| FT-6-01 | Tela `/admin` com visão geral do SaaS                      |
| FT-6-02 | Tela `/admin/tenants` com gestão de clínicas               |
| FT-6-03 | Cards de tenants ativos, tenants totais e tenants inativos |
| FT-6-04 | Card de nutricionistas ativas                              |
| FT-6-05 | Card de sessões ativas                                     |
| FT-6-06 | Card de pacientes totais agregados                         |
| FT-6-07 | Card de média de pacientes por nutricionista               |
| FT-6-08 | Gráfico de crescimento de tenants                          |
| FT-6-09 | Gráfico de crescimento de pacientes                        |
| FT-6-10 | Gráfico de uso clínico agregado                            |
| FT-6-11 | Tabela de tenants recentes                                 |
| FT-6-12 | Tabela de tenants mais ativos                              |
| FT-6-13 | Tabela de eventos de segurança agregados                   |
| FT-6-14 | Área reservada para MRR e billing futuro                   |
| FT-6-15 | Unificação visual do admin com o tema NutriOpus            |

## 14. Histórias de usuário da Sprint 6

| ID      | História                                                                        |
| ------- | ------------------------------------------------------------------------------- |
| US-6-01 | Como administrador global, quero ver quantas clínicas usam o sistema          |
| US-6-02 | Como administrador global, quero saber quantas clínicas estão ativas          |
| US-6-03 | Como administrador global, quero ver crescimento mensal de tenants            |
| US-6-04 | Como administrador global, quero ver total agregado de pacientes              |
| US-6-05 | Como administrador global, quero saber a média de pacientes por nutricionista |
| US-6-06 | Como administrador global, quero ver sessões ativas no sistema                |
| US-6-07 | Como administrador global, quero identificar tenants sem uso recente          |
| US-6-08 | Como administrador global, quero ver ações sensíveis agregadas                |
| US-6-09 | Como administrador global, quero ver acessos negados e riscos de segurança    |
| US-6-10 | Como administrador global, quero alterar plano de um tenant manualmente       |
| US-6-11 | Como dono do produto, quero preparar métricas para assinatura futura          |
| US-6-12 | Como responsável por LGPD, não quero visualizar dados clínicos individuais    |

## 15. Critérios de aceite da Sprint 6

1. `/admin` é acessível apenas por `GLOBAL_ADMIN`.
2. Usuário comum e owner de clínica não acessam `/admin`.
3. Dashboard mostra métricas agregadas.
4. Nenhum dado clínico individual aparece.
5. Navbar e sidebar seguem padrão visual do NutriOpus.
6. Filtros e paginação funcionam.
7. Cards possuem skeleton.
8. Tabelas possuem empty state.
9. i18n está completo em pt-BR e en.
10. Documentação explica dados permitidos e proibidos para admin global.

A modelagem de dashboard agregado está alinhada ao princípio de minimização de dados. A ANPD orienta que agentes de tratamento adotem medidas de segurança proporcionais ao risco, e em dados de saúde o risco é naturalmente maior.

# Sprint 7: Assinaturas, Planos e Limites

## 16. Objetivo da Sprint 7

Criar a estrutura interna de monetização do NutriOpus. Não é obrigatório integrar Stripe ou Mercado Pago nesta sprint, mas o sistema deve ficar preparado para planos, trial, limites, status de assinatura e bloqueio/liberação de recursos por plano.

Stripe Billing trabalha com produtos, preços, assinaturas, webhooks e portal de cliente, então a arquitetura interna do NutriOpus deve separar plano comercial, assinatura do tenant, status de cobrança e limites de uso.

## 17. Requisitos da Sprint 7

| ID      | Requisito                                                              |
| ------- | --------------------------------------------------------------------------|
| RQ-7-01 | O sistema deve possuir catálogo interno de planos                      |
| RQ-7-02 | Cada tenant deve ter uma assinatura vinculada                          |
| RQ-7-03 | O sistema deve suportar status de trial                                |
| RQ-7-04 | O sistema deve suportar status ativo                                   |
| RQ-7-05 | O sistema deve suportar status vencido                                 |
| RQ-7-06 | O sistema deve suportar status cancelado                               |
| RQ-7-07 | Cada plano deve definir limites de pacientes                           |
| RQ-7-08 | Cada plano deve definir limites de membros de equipe                   |
| RQ-7-09 | Cada plano deve definir limites de PDFs ou planos alimentares          |
| RQ-7-10 | Cada plano deve definir recursos liberados                             |
| RQ-7-11 | O sistema deve bloquear criação acima do limite                        |
| RQ-7-12 | O sistema deve exibir aviso de limite próximo                          |
| RQ-7-13 | O admin global deve alterar plano manualmente                          |
| RQ-7-14 | Alteração de plano deve gerar audit log                                |
| RQ-7-15 | A estrutura deve permitir integração futura com Stripe ou Mercado Pago |

## 18. Especificações técnicas da Sprint 7

| ID       | Especificação                                             |
| -------- | -------------------------------------------------------------|
| ESP-7-01 | Criar ou revisar model `SubscriptionPlan`                 |
| ESP-7-02 | Criar ou revisar model `TenantSubscription`               |
| ESP-7-03 | Criar model `FeatureLimit`, se não existir                |
| ESP-7-04 | Criar model `UsageCounter`, se não existir                |
| ESP-7-05 | Criar enum `BillingStatus`                                |
| ESP-7-06 | Criar helper `getTenantSubscriptionContext()`             |
| ESP-7-07 | Criar helper `requireFeature(featureKey)`                 |
| ESP-7-08 | Criar helper `checkUsageLimit(resourceKey)`               |
| ESP-7-09 | Criar service `billingPlan.service.ts`                    |
| ESP-7-10 | Criar service `usageLimit.service.ts`                     |
| ESP-7-11 | Aplicar limite em criação de pacientes                    |
| ESP-7-12 | Aplicar limite em criação de membros                      |
| ESP-7-13 | Aplicar limite em geração de PDF                          |
| ESP-7-14 | Aplicar limite em recursos premium                        |
| ESP-7-15 | Criar seed de planos Free, Starter, Professional e Clinic |
| ESP-7-16 | Criar documentação de recursos por plano                  |

## 19. Features da Sprint 7

| ID      | Feature                             |
| ------- | ---------------------------------------|
| FT-7-01 | Catálogo de planos no admin global  |
| FT-7-02 | Criação e edição de planos          |
| FT-7-03 | Ativação e desativação de planos    |
| FT-7-04 | Vincular tenant a plano             |
| FT-7-05 | Alterar plano de tenant             |
| FT-7-06 | Status trial por tenant             |
| FT-7-07 | Status ativo por tenant             |
| FT-7-08 | Status vencido por tenant           |
| FT-7-09 | Status cancelado por tenant         |
| FT-7-10 | Limite de pacientes                 |
| FT-7-11 | Limite de membros da equipe         |
| FT-7-12 | Limite de PDFs                      |
| FT-7-13 | Limite de recursos premium          |
| FT-7-14 | Aviso de limite próximo             |
| FT-7-15 | Bloqueio amigável ao atingir limite |
| FT-7-16 | Preparação para webhooks de billing |

## 20. Histórias de usuário da Sprint 7

| ID      | História                                                                      |
| ------- | ----------------------------------------------------------------------------- |
| US-7-01 | Como admin global, quero cadastrar planos do NutriOpus                        |
| US-7-02 | Como admin global, quero alterar o plano de uma clínica                       |
| US-7-03 | Como admin global, quero ver quais tenants estão em trial                     |
| US-7-04 | Como admin global, quero ver quais tenants estão vencidos                     |
| US-7-05 | Como dona da clínica, quero saber quando estou próxima do limite de pacientes |
| US-7-06 | Como dona da clínica, quero entender quais recursos meu plano libera          |
| US-7-07 | Como nutricionista, quero receber mensagem clara quando atingir limite        |
| US-7-08 | Como assistente, não quero ver botão de recurso bloqueado pelo plano          |
| US-7-09 | Como owner, quero fazer upgrade quando precisar de mais pacientes             |
| US-7-10 | Como admin global, quero preparar integração futura com pagamento recorrente  |
| US-7-11 | Como mantenedor, quero que planos sejam definidos no banco e não hardcoded    |
| US-7-12 | Como auditor, quero que alterações de plano sejam registradas                 |

## 21. Planos sugeridos

| Plano             | Público                  | Limites sugeridos                                   | Recursos                                              |
| ------------------ | ------------------------- | ------------------------------------------------------| --------------------------------------------------------|
| Free Trial        | Teste inicial            | 15 pacientes, 1 usuário, 5 PDFs                     | Anamnese, pacientes, atendimento básico               |
| Starter           | Nutricionista individual | 80 pacientes, 1 usuário, 30 PDFs/mês                | Fluxo clínico e planos básicos                        |
| Professional      | Nutricionista ativa      | 300 pacientes, 3 membros, PDFs ilimitados razoáveis | Portal do paciente, agenda, auditoria básica          |
| Clinic            | Equipe pequena           | 1000 pacientes, 10 membros                          | RBAC granular, auditoria completa, dashboard avançado |
| Enterprise futuro | Clínicas maiores         | Personalizado                                       | SLA, suporte, exportações, integrações                |

## 22. Critérios de aceite da Sprint 7

1. Existe catálogo de planos.
2. Tenant possui assinatura vinculada.
3. Planos possuem limites.
4. Recursos podem ser bloqueados por plano.
5. Limites são checados server-side.
6. Admin global pode alterar plano.
7. Alteração de plano gera audit log.
8. UI mostra status do plano.
9. Sistema prepara integração futura com gateway de pagamento.
10. Documentação de planos foi criada.

# 23. Matriz geral de requisitos

| Código | Requisito geral                      |
| ------ | -----------------------------------------|
| RG-01  | Validar isolamento multi-tenant      |
| RG-02  | Validar RBAC server-side             |
| RG-03  | Validar sessão revogada              |
| RG-04  | Sanitizar audit logs                 |
| RG-05  | Criar dashboard global               |
| RG-06  | Proteger `/admin` por `GLOBAL_ADMIN` |
| RG-07  | Exibir métricas agregadas            |
| RG-08  | Ocultar dados clínicos individuais   |
| RG-09  | Criar catálogo de planos             |
| RG-10  | Criar assinatura por tenant          |
| RG-11  | Criar limites por plano              |
| RG-12  | Criar bloqueios por limite           |
| RG-13  | Criar documentação de auditoria      |
| RG-14  | Criar documentação de billing        |
| RG-15  | Manter padrão visual NutriOpus       |

# 24. Matriz geral de especificações

| Código | Especificação geral                                          |
| ------ | -------------------------------------------------------------- |
| EG-01  | Server Actions sensíveis devem chamar `requirePermission`    |
| EG-02  | Queries sensíveis devem filtrar por `tenantId`               |
| EG-03  | Admin global deve usar service próprio de métricas agregadas |
| EG-04  | Admin global não deve usar services clínicos individuais     |
| EG-05  | Logs devem usar metadata sanitizada                          |
| EG-06  | Sessões devem ser verificadas no request                     |
| EG-07  | Planos devem ser modelados no banco                          |
| EG-08  | Limites devem ser checados no servidor                       |
| EG-09  | UI deve usar i18n                                             |
| EG-10  | UI deve usar tema NutriOpus                                   |
| EG-11  | Tabelas devem usar paginação server-side                     |
| EG-12  | Cards devem usar skeleton                                    |
| EG-13  | Empty states devem ser consistentes                          |
| EG-14  | Alterações sensíveis devem gerar audit log                   |
| EG-15  | Documentação deve ser atualizada ao final de cada sprint      |

# 25. Matriz geral de features

| Código | Feature geral                      |
| ------ | ---------------------------------------|
| FG-01  | Validação multi-tenant             |
| FG-02  | Validação RBAC                     |
| FG-03  | Validação de sessão revogada       |
| FG-04  | Auditoria sanitizada               |
| FG-05  | Tela admin global                  |
| FG-06  | Cards de métricas SaaS             |
| FG-07  | Tabela de tenants                  |
| FG-08  | Filtros de tenants                 |
| FG-09  | Métricas de sessões                |
| FG-10  | Métricas de segurança              |
| FG-11  | Catálogo de planos                 |
| FG-12  | Alteração rápida de plano          |
| FG-13  | Limites por plano                  |
| FG-14  | Avisos de limite                   |
| FG-15  | Bloqueio de recurso por assinatura |

# 26. Matriz geral de histórias de usuário

| Código | História                                                                  |
| ------ | -----------------------------------------------------------------------------|
| HU-01  | Como dona da clínica, quero ter meus dados isolados de outras clínicas    |
| HU-02  | Como assistente, quero acessar apenas o que foi liberado para mim         |
| HU-03  | Como secretária, quero usar agenda sem ver dados clínicos sensíveis       |
| HU-04  | Como nutricionista, quero saber quem mexeu nos pacientes                  |
| HU-05  | Como owner, quero revogar sessões suspeitas                               |
| HU-06  | Como admin global, quero ver crescimento do SaaS                          |
| HU-07  | Como admin global, quero ver tenants ativos e inativos                    |
| HU-08  | Como admin global, quero ver métricas de uso sem acessar prontuário       |
| HU-09  | Como admin global, quero gerenciar planos                                 |
| HU-10  | Como owner, quero saber meu plano atual                                   |
| HU-11  | Como owner, quero saber quando estou perto do limite                      |
| HU-12  | Como usuário, quero mensagens claras quando algo for bloqueado            |
| HU-13  | Como mantenedor, quero documentação técnica de segurança                  |
| HU-14  | Como auditor, quero logs íntegros e úteis                                 |
| HU-15  | Como dono do produto, quero preparar assinatura sem refatorar tudo depois |

# 27. Fontes de projetos no GitHub para referência

Essas fontes servem como inspiração arquitetural. Não devem ser copiadas sem adaptação ao NutriOpus.

| Fonte                               | O que observar                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| nextjs/saas-starter                 | Estrutura SaaS com Next.js, Postgres, Stripe e shadcn/ui, incluindo RBAC básico com Owner e Member                           |
| vercel/nextjs-subscription-payments | Fluxo clássico de assinatura com Next.js, Supabase e Stripe, apesar de estar arquivado e substituído por template novo       |
| nextacular/nextacular               | Starter multi-tenant com Next.js, Tailwind, Prisma e Stripe                                                                  |
| mickasmt/next-saas-stripe-starter   | SaaS starter com Next.js, Prisma, Auth.js, Stripe, admin panel e server actions                                              |
| NextJSTemplates/play-nextjs         | Boilerplate SaaS com páginas e componentes para startups                                                                     |
| openstatusHQ/openstatus             | Produto open source com dashboard, monitoramento, status page e organização de app real                                      |
| twentyhq/twenty                     | CRM open source com PostgreSQL, workflows e arquitetura robusta de produto administrativo                                    |
| triggerdotdev/trigger.dev           | Plataforma open source em TypeScript com workflows, jobs e arquitetura SaaS complexa                                         |
| midday-ai/midday                    | SaaS open source com Next.js, billing, overview financeiro e produto administrativo                                          |
| dubinc/dub                          | SaaS open source de link attribution com analytics e visão de produto multiusuário                                           |
| better-auth/better-auth             | Projeto de autenticação e autorização em TypeScript, útil como referência conceitual para sessões, organizações e permissões |

# 28. Fontes online de segurança, LGPD, privacidade e auditoria

| Fonte                                                  | Uso no NutriOpus                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------|
| ANPD, Guia de Segurança para agentes de pequeno porte | Base para medidas administrativas e técnicas de segurança         |
| ANPD, RIPD                                             | Base para relatório de impacto de dados sensíveis                |
| ANPD, direitos dos titulares                           | Base para solicitações de acesso, correção, eliminação e revisão |
| MCTI, explicação da LGPD e dado sensível               | Base conceitual para dado de saúde como dado sensível             |
| OWASP Logging Cheat Sheet                              | Base para audit logs seguros                                      |
| OWASP Logging Vocabulary                               | Base para padronizar eventos                                      |
| PostgreSQL Row Security Policies                       | Base conceitual de isolamento no banco                             |
| Supabase RLS                                           | Base para possível reforço futuro no banco                        |
| Supabase Secure Data                                   | Base para menor privilégio e segurança de tabelas                |
| Stripe Billing overview                                | Base de arquitetura de assinatura                                 |
| Stripe Billing webhooks                                | Base futura para sincronizar status de assinatura                 |
| Stripe Customer Portal                                 | Base futura para autoatendimento de cobrança                      |

# 29. Documentações técnicas recomendadas

| Documentação                       | Aplicação prática                                                      |
| ------------------------------------- | --------------------------------------------------------------------------|
| Next.js App Router                 | Estrutura de rotas, layouts e navegação                                |
| Next.js Server e Client Components | Separação entre SSR e interatividade                                   |
| Prisma com Next.js                 | Uso de Prisma em projeto Next.js                                       |
| Prisma PostgreSQL connector        | Tipos, conexão e PostgreSQL                                            |
| PostgreSQL Row Level Security      | Base para possível camada extra de isolamento                          |
| Supabase RLS                       | Segurança em tabelas e policies                                        |
| Supabase Storage access control    | Futuro controle de PDFs e arquivos clínicos                            |
| Stripe Subscriptions               | Assinatura recorrente                                                  |
| Stripe Webhooks                    | Sincronização de eventos de cobrança                                   |
| Stripe Customer Portal             | Portal de pagamento e gestão de assinatura                             |
| shadcn/ui Sidebar                  | Referência caso o projeto use ou adapte sidebar baseada em componentes |
| shadcn/ui Skeleton                 | Referência para loading states consistentes                            |

---

## Nota de execução (2026-07-19)

A Sprint de **unificação visual do Admin Global** (documento separado, ver
`docs/admin-global-ui-unification.md`) foi implementada diretamente nesta sessão,
sem depender do prompt de handoff para Codex mencionado em rascunhos anteriores
deste documento.

Na mesma sessão, as três sprints abaixo também foram implementadas (não só
planejadas) — detalhes, arquivos tocados, comandos executados e pendências
em `docs/SPRINT_5.1_HARDENING_VALIDATION.md` e
`docs/SPRINT_6_7_ADMIN_METRICS_AND_BILLING.md`:

- **Sprint 5.1 (Hardening)**: auditoria de código de todas as Server Actions
  sensíveis confirmou isolamento multi-tenant, sanitização de audit log,
  enforcement de sessão revogada e precedência de overrides ALLOW/DENY já
  corretos; encontrou e corrigiu um gap real de RBAC granular em 3 arquivos
  de actions (`appointment`, `reviewAnamnese`, `patient-timeline`) que só
  validavam tenant, não a permissão específica do catálogo.
- **Sprint 6 (métricas avançadas)**: `globalAdminService.getGlobalMetrics()`
  ganhou sessões ativas, logins/7d, acessos negados/30d, ações sensíveis/30d
  e alertas de segurança abertos — tudo agregado, sem dado clínico individual.
- **Sprint 7 (Assinaturas/Billing)**: `BillingStatus` (enum), `FeatureLimit` e
  `UsageCounter` (models novos) + helpers `requireFeature`/`checkUsageLimit`/
  `checkEntityLimit` + limites aplicados de verdade em criação de paciente,
  convite de membro de equipe, geração de PDF de plano alimentar e overrides
  de RBAC por plano. Integração com gateway de pagamento real continua fora
  do escopo, como o próprio roadmap já previa.

Pendências que sobraram (não são blockers, são follow-ups documentados):
UI de "meu plano/limite atual" para a nutricionista, CRUD de planos pela UI
do Admin Global, gate de `auditTrail.enabled` em alguma tela, testes
automatizados dedicados para os helpers de billing, e aplicar a migration
`20260719000000_add_billing_limits` num banco real antes do próximo deploy.
