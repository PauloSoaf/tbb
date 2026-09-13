# MR — Hardening do beta, billing, storage, transcrição realtime e evolução clínica/canvas

## Título sugerido

`feat/fix: consolida hardening, limites por plano, storage governance, transcrição realtime e fluxos clínicos`

## Contexto

Esta MR consolida todas as mudanças que estavam sem commit na branch
`fix/beta-version-bugs` em 15/08/2026. O conjunto vai além de correções pontuais:
ele fecha lacunas de autorização, transforma planos e limites em regras
efetivamente aplicadas, cria governança de armazenamento, adiciona transcrição
automática self-hosted e evolui os fluxos de plano alimentar e antropometria.

O escopo auditado continha 247 arquivos no worktree: 116 arquivos rastreados
alterados/adicionados e 131 arquivos novos. Por isso, a revisão deve ser feita
por domínio e o deploy exige
coordenação entre banco, seed, Vercel, storage e serviços persistentes.

## Resumo executivo

- Reforça RBAC e isolamento multi-tenant em Server Actions, páginas e OAuth.
- Implementa planos, feature flags e limites de pacientes, equipe, PDF, storage
  e transcrição.
- Centraliza uploads tenant-aware em um ledger com quota, rollback e auditoria.
- Cria observabilidade de storage no Admin Global, snapshots diários, alertas,
  exportação CSV, reconciliação e backfill.
- Entrega transcrição automática em tempo real para atendimentos online e
  presenciais com gateway HMAC, Speaches/faster-whisper e persistência apenas de
  segmentos finais.
- Evolui a Oficina de Planos com imagens ajustáveis, edição inline, medidas
  caseiras automáticas, personalização de PDF e biblioteca reutilizável.
- Padroniza feedback de operações assíncronas e navegações, com loading por
  ação, proteção contra clique duplicado e retorno contextual em páginas 404.
- Evolui antropometria com perfis clínicos, razões corporais e protocolos de
  dobras cutâneas recalculados no servidor.
- Unifica a experiência visual e o i18n do Admin Global, melhora onboarding,
  feedback de cadastro e favoritos de tema.

## Alterações detalhadas

### 1. Segurança, RBAC e isolamento de tenant

- `appointment.action.ts`, `patient-timeline.action.ts` e
  `reviewAnamnese.action.ts` deixam de confiar apenas na sessão/slug e passam a
  exigir permissões granulares para agenda, prontuário e anamnese.
- As ações e páginas de plano alimentar passam a exigir `mealPlans.create`,
  `mealPlans.edit` ou `mealPlans.generatePdf`, conforme a operação.
- `requireGlobalAdmin` deixa de confiar somente no papel contido na sessão e
  revalida o papel `GLOBAL_ADMIN` no banco.
- `assertTenantAccess` permite corretamente que um Global Admin atravesse
  allowlists de papéis locais sem liberar papéis comuns.
- Login e proxy redirecionam Global Admin para `/admin`.
- Falhas de login sem tenant deixam de inventar um `tenantId`: agora são
  registradas no novo `GlobalAuditLog`.
- O sanitizador de auditoria foi reforçado para impedir conteúdo de
  transcrição, áudio, texto clínico ou resumo em metadata.
- Novos testes cobrem o bypass controlado do Global Admin, isolamento de tenant
  e o fluxo resiliente de criação de paciente.

### 2. OAuth do Google Agenda e onboarding

- O OAuth usa `state` aleatório de 32 bytes, cookie HttpOnly de curta duração e
  comparação timing-safe no callback.
- O tenant do callback vem do estado vinculado à sessão, não da query string.
- Início e callback exigem a permissão `settings.editClinic`.
- O cookie de estado é apagado em sucesso e em todos os caminhos de erro.
- Quando as credenciais do Google não existem, a UI informa que a integração
  não está configurada em vez de iniciar um fluxo quebrado.
- Links que iniciam OAuth usam navegação de documento; onboarding e configurações
  apontam para as âncoras corretas de perfil e Google Agenda.

### 3. Billing, planos e limites reais

- `TenantSubscription.status` passa de string livre para o enum
  `BillingStatus` (`TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`).
- Novos models `FeatureLimit` e `UsageCounter` suportam flags e limites por
  plano, inclusive contadores mensais.
- Tenants sem assinatura explícita recebem contexto `FREE`/`TRIAL`.
- `TenantFeatureOverride` permite exceções por tenant, com motivo e expiração;
  override válido prevalece sobre o plano.
- Limites aplicados no servidor:

  - `patients.max` ao cadastrar paciente;
  - `team.max` ao convidar membro;
  - `mealPlanPdf.monthly` antes de gerar o PDF;
  - `rbacOverrides.enabled` ao salvar permissões específicas por membro;
  - `storage.*` em todos os uploads rastreados;
  - `transcription.*` nos fluxos realtime.

- `/admin/planos` passa a editar feature limits e avisa quantos tenants
  ficariam acima da nova cota de storage.
- O seed adiciona o catálogo FREE/BASIC/PRO/CLINIC, limites de storage,
  transcrição e as novas permissões.

### 4. Governança e observabilidade de armazenamento

- `StorageFile` vira o ledger por tenant, usuário, finalidade, recurso, URL e
  tamanho.
- `uploadTrackedFile` verifica limite total, limite por arquivo e limite por
  finalidade antes do upload.
- Upload bloqueado gera auditoria sem conteúdo clínico.
- Se o provider salvar o arquivo e o ledger falhar, o arquivo é removido como
  rollback para evitar órfãos.
- Exclusões passam pelo mesmo gateway para remover provider e ledger.
- Documentos, templates, foto de perfil, transcrição de áudio, upload genérico
  e imagens de plano alimentar passam a usar o fluxo rastreado.
- Novos snapshots diários (`StorageUsageSnapshot` e breakdown por finalidade)
  usam `BigInt` para não estourar cotas acima de 2 GB.
- O cron `/api/cron/storage-snapshot` é idempotente, protegido por
  `CRON_SECRET` e agendado diariamente às 06:00 UTC em `vercel.json`.
- `/admin/storage` entrega KPIs, consumo por plano, crescimento de 30 dias,
  tabela de tenants, drawer detalhado e edição de override.
- Admin também ganha exportação CSV, reconciliação ledger/provider, métricas
  reais do PostgreSQL e snapshot manual.
- `StorageQuotaBanner` alerta a clínica a partir de 70%, com patamares de 70%,
  90% e 100%; cruzamentos de patamar geram `SecurityEvent` deduplicado.
- `scripts/backfill-storage-ledger.ts` importa arquivos anteriores ao ledger de
  forma idempotente e oferece `--dry-run`.

### 5. Transcrição automática em tempo real

- Novos models para configurações, sessão de transcrição, segmentos,
  participantes, speaker e uso mensal.
- O ciclo de vida cobre iniciar, pausar, retomar, parar, salvar, descartar,
  excluir, exportar e anexar texto revisado ao prontuário.
- Apenas segmentos finais são persistidos; partials e áudio não são salvos.
- Reenvios após reconexão são idempotentes por `transcriptId + segmentKey`.
- Nutricionista, paciente, equipe e sala presencial têm fontes de speaker
  separadas e editáveis.
- O atendimento ganha aba de transcrição, legenda ao vivo, timeline, estados do
  provider/captura/participantes e resumo final.
- Paciente usa endpoint autenticado próprio e recebe aviso visível; falha de
  transcrição não interrompe a consulta.
- Histórico por paciente oferece busca, cópia, exportação, exclusão e anexo ao
  prontuário conforme RBAC e plano.
- Configuração por clínica fica em
  `/dashboard/[tenant]/configuracoes/transcricao`.
- Admin Global vê apenas health e métricas agregadas, nunca texto, áudio,
  paciente ou conteúdo clínico.
- Foram adicionadas 14 permissões `transcription.*`, com grants distintos para
  OWNER, NUTRITIONIST e papéis restritos.
- O provider principal é Speaches/faster-whisper, atrás de um gateway WebSocket
  próprio com token HMAC curto, issuer/audience, origem, single-use, limites de
  taxa/tamanho e métricas Prometheus.
- A infraestrutura Docker suporta CPU e GPU; o build derivado fixa FastAPI
  0.117.1 por compatibilidade com Speaches 0.9.0-rc.3.

### 6. Oficina de Planos e PDF clínico

- Upload de JPEG/PNG/WebP valida MIME e assinatura binária, ownership do plano,
  tenant e permissão antes de gravar ou remover.
- O Tiptap passa a suportar imagens no conteúdo e atributos de imagem em
  refeições/alimentos: URL, alt, legenda e exibição no PDF.
- Medidas caseiras podem ser digitadas ou escolhidas de sugestões; a origem
  manual é preservada.
- O Studio ganha painel de estilo do PDF com:

  - logotipo e fallback para a foto da clínica;
  - posição e tamanho;
  - marca-d'água de texto ou imagem;
  - opacidade e repetição;
  - paginação e formato do número;
  - data/paciente no rodapé;
  - modo de imagens: todas, apenas refeições ou nenhuma.

- Prévia e PDF do template/plano respeitam branding, imagens estruturadas,
  medida caseira e paginação real por folha.
- Cards de refeição e alimentos podem ser reordenados; alimentos também podem
  ser movidos entre refeições sem perder o registro clínico ao salvar.
- O painel lateral passa a organizar `Modelos`, `Refeições` e `Alimentos` como
  uma biblioteca isolada por nutricionista.
- Refeições e alimentos podem ser salvos como snapshots reutilizáveis e
  arrastados de volta para o canvas.
- Cards de refeições salvas exibem totais de kcal, carboidratos, proteínas e
  gorduras. No hover/foco ou por toque, expandem a altura e revelam uma lista
  compacta de alimentos/quantidades, limitada a cinco itens com contador do
  excedente.
- A assinatura padrão do nutricionista é preenchida a partir do cadastro.
- A abertura de cardápios antigos permanece disponível durante a transição do
  Prisma; a biblioteca fica vazia até o Client ser regenerado e a migração ser
  aplicada.
- A URL do editor é centralizada em `routes.oficinaStudio`; cards, linhas da
  listagem e o fluxo de duplicação passam a produzir a mesma rota canônica.
- Criação e duplicação invalidam também a URL exata do novo `mealPlanId`, além
  da listagem. Isso evita reutilizar uma resposta 404 do Router Cache durante
  os 300 segundos configurados em `staleTimes.dynamic`.
- O segmento dinâmico `[templateId]` possui `loading.tsx`, permitindo prefetch
  do shell e feedback imediato enquanto o plano é resolvido/compilado.
- A resolução do Estúdio continua protegida por
  `requirePermission("mealPlans", "edit", tenant)` e pela consulta conjunta de
  `id + nutritionistId`; a correção de cache não amplia acesso entre tenants.

### 7. Antropometria clínica

- Cada avaliação persiste snapshot de perfil (`CHILD`, `ADULT`, `ELDERLY`),
  idade e sexo biológico de referência.
- IMC usa referência adulta ou Lipschitz para idosos; o perfil infantil exibe o
  valor sem aplicar classificação adulta indevida.
- RCQ e relação cintura/estatura são calculadas e classificadas somente quando
  existe referência aplicável.
- Painel de dobras aceita até três leituras por ponto, calcula médias e alerta
  variação relativa acima de 5%.
- Protocolos: Jackson-Pollock 3/7, Durnin-Womersley, Slaughter e modo manual.
- Percentual de gordura, densidade, massa gorda e massa magra são recalculados
  no servidor a partir das leituras de origem; valores derivados do navegador
  não são confiados.
- O JSON de leituras é versionado e os resumos permanecem consultáveis.

### 8. Admin Global, dashboard, temas e i18n

- O Admin Global reutiliza `DashboardSidebar` e `DashboardHeader`, com navegação
  responsiva, badges, status operacional e item de storage.
- Overview ganha métricas de sessão, login, acessos negados, ações sensíveis,
  eventos de segurança, storage e transcrição agregada.
- Tenants, planos e auditoria usam cabeçalhos e traduções consistentes.
- Cadastro de paciente redireciona para a lista com toast de sucesso; falhas de
  auditoria, e-mail ou invalidação de cache após o commit não transformam um
  cadastro salvo em falso erro.
- Temas curados podem ser favoritados; favoritos recentes aparecem no menu
  rápido e são persistidos em `localStorage`.
- Novas chaves PT/EN/ES cobrem Admin, storage, transcrição, plano clínico,
  antropometria, OAuth e temas.

### 9. Navegação, loading e páginas 404

- `AsyncButton` padroniza ações que retornam Promise ou recebem estado
  controlado: spinner, `aria-busy`, bloqueio de clique repetido, label de
  progresso e largura visual estável.
- `PendingButtonLink` usa o estado de navegação do App Router, reserva o espaço
  do conteúdo e limpa o pending quando o pathname muda, com timeout defensivo
  para transições abortadas. Mudanças apenas de query/hash ficam a cargo do
  `useLinkStatus`, evitando estado preso e dependência de Suspense em cada CTA.
- `NavigationFeedback`, montado no layout raiz, fornece uma barra superior para
  links internos legados enquanto a migração para componentes explícitos é
  concluída; nova aba, download, origem externa e links desabilitados não são
  interceptados.
- A cobertura explícita foi ampliada em Admin, dashboard, pacientes, avaliações,
  atendimentos, prontuário, equipe, metas, configurações, portal e Oficina de
  Planos.
- A passagem residual cobre também LGPD, diário, comparação de pacientes,
  lista de compras, substituições, editor legado de refeições, vídeo nativo e
  retry/troca de dispositivo na transcrição em tempo real.
- Operações concorrentes usam estado por ação/registro. Somente o botão que
  iniciou a chamada mostra spinner; controles locais continuam disponíveis
  quando não dependem da mesma gravação.
- No Estúdio, salvar, salvar como modelo, duplicar, excluir, aplicar a paciente
  e abrir PDF têm feedback direcionado. Fluxos com `router.push` mantêm o
  loading até a URL realmente mudar, sem bloquear drag-and-drop ou edição
  inline do `TiptapCanvas`.
- A aplicação de modelo a paciente mantém o modal e o spinner visíveis até a
  navegação, desabilitando nova submissão e alteração da seleção durante a
  operação.
- `ContextualHomeLink` resolve o destino de “Voltar ao início” conforme o
  contexto: `/dashboard/<tenant>`, `/portal/<tenant>`, `/admin` ou `/` apenas
  para páginas públicas. As páginas 404 global e do dashboard usam esse fluxo,
  impedindo que o nutricionista seja enviado ao site público/marketing.

### 10. Documentação e tooling

- Foram adicionados/atualizados documentos de hardening, admin/billing,
  storage, transcrição e sprint clínica.
- `collab-IAS-REPORT.md` registra decisões, validações e incidentes de migration.
- `.claude/settings.json` passa a permitir `WebSearch` no ambiente Claude local.
- Esta MR também adiciona esta descrição e o guia operacional
  `DEPLOY_UNCOMMITTED_CHANGES.md`.

## Banco de dados

As nove migrations novas devem ser aplicadas na ordem do nome:

1. `20260719000000_add_billing_limits`
2. `20260722000000_add_storage_tracking`
3. `20260726005000_extend_transcript_status`
4. `20260726010000_realtime_transcription`
5. `20260726020000_add_storage_governance`
6. `20260726030000_add_storage_snapshots`
7. `20260726031000_fix_storage_snapshot_bigint`
8. `20260729070000_clinical_meal_plan_upgrade`
9. `20260815090000_meal_plan_library`

O split `05000` → `10000` é intencional: PostgreSQL não permite usar um valor
novo de enum como default na mesma transação em que esse valor é adicionado.

Depois das migrations é obrigatório executar
`npx tsx prisma/seed-permissions.ts` com `GLOBAL_ADMIN_EMAIL` explicitamente
configurado. Não usar `npm run prisma:seed` em produção: esse comando cria a
conta de demonstração `teste@nutriopus.com`.

## Impacto de infraestrutura

- PostgreSQL/Supabase com `DATABASE_URL` e `DIRECT_URL` corretas.
- Vercel Blob em produção; storage local é efêmero na Vercel.
- Vercel Cron com `CRON_SECRET`.
- Host persistente com Docker para gateway de transcrição + Speaches, publicado
  por `wss://`/HTTPS.
- Serviço de sinalização WebRTC persistente deve continuar ativo fora da Vercel.
- Variáveis do Google, Resend, IA e TURN continuam condicionais às features
  habilitadas.

Passo a passo completo: [DEPLOY_UNCOMMITTED_CHANGES.md](./DEPLOY_UNCOMMITTED_CHANGES.md).

## Validação executada em 14/08/2026

| Verificação | Resultado |
| --- | --- |
| `git diff --check` | passou; apenas avisos de normalização LF/CRLF |
| `npx prisma validate` | schema válido |
| `npx tsc --noEmit` | 0 erros |
| `npm test -- --reporter=dot` | 81 arquivos, 781/781 testes |
| gateway `npm test` | 5/5 testes |
| lint somente dos arquivos alterados/novos | 0 erros, 3 warnings |
| `npm run build` | build Next.js 16.2.7 concluído |
| `npx prisma migrate status` | 28 migrations; banco apontado pelo `.env` local atualizado |

O `npm run lint` global continua falhando com 27 erros e 64 warnings legados,
principalmente scripts CommonJS, `any` explícito e regras novas do React Hooks.
Esses erros não foram introduzidos por este conjunto, mas impedem declarar o
lint global como verde.

O build também avisou que o ambiente local está usando storage local em modo de
produção e não tem `RESEND_API_KEY`. Isso não quebra a compilação, mas é
configuração obrigatória/esperada para um deploy funcional com uploads e e-mail.

### Validação incremental em 15/08/2026

Após a biblioteca e o drag-and-drop entre refeições, `npx tsc --noEmit` e o
ESLint focado nos arquivos do canvas/serviços passaram sem erros. A suíte
completa e a build não foram repetidas nesta etapa; devem ser executadas no CI
antes do merge.

Na passagem seguinte de navegação/loading, o ESLint focado passou nos
componentes alterados. Os testes focados de rota/navegação do Estúdio passaram
com 25/25 casos; build e suíte completa continuaram reservadas ao CI.

## Roteiro de teste manual

1. Validar login de usuário comum e Global Admin; confirmar redirecionamento e
   bloqueios RBAC.
2. Em `/admin`, revisar métricas; em `/admin/planos`, editar um limite; em
   `/admin/storage`, abrir drawer, exportar CSV e executar reconciliação.
3. Cadastrar paciente e confirmar limite do plano, redirecionamento único e
   toast de sucesso.
4. Testar Google Agenda com credenciais válidas, state inválido e ambiente sem
   credenciais.
5. Fazer upload e exclusão de documento, template, foto e imagem de plano;
   testar cota total, cota por arquivo e rollback.
6. Criar plano alimentar, inserir imagens/medidas, mover alimentos dentro e
   entre refeições, salvar/reutilizar itens da biblioteca, configurar branding
   e gerar PDF paginado. Duplicar um modelo e abrir imediatamente o novo ID,
   confirmando skeleton/loading e ausência de 404, inclusive em navegação fria.
7. Criar avaliações adulta, idosa e infantil; testar razões e protocolos de
   dobras com leituras repetidas.
8. Abrir atendimento como nutricionista e paciente em navegadores separados;
   testar ciência, microfones, partials, finais, pause/resume, save/discard,
   histórico e anexo revisado ao prontuário.
9. Derrubar o provider de transcrição e confirmar que o atendimento continua
   operacional com estado offline controlado.
10. Invocar o cron com e sem `CRON_SECRET` e confirmar idempotência do snapshot.
11. Conferir loading e bloqueio de duplo clique em ações assíncronas críticas;
    abrir uma URL inexistente dentro de dashboard, portal e admin e validar que
    “Voltar ao início” retorna ao contexto correto.

## Riscos e limitações conhecidas

- O escopo é grande; recomenda-se revisão e homologação por domínio, mesmo que
  permaneça em uma única MR.
- Arquivos anteriores ao ledger não contam para a cota até o backfill.
- O backfill real pode colocar tenants existentes acima da cota; rodar primeiro
  com `--dry-run` e comunicar os afetados.
- Alguns formulários antigos ainda bloqueiam 5 MB antes da regra de plano;
  limites maiores de upload podem não ser alcançáveis nesses fluxos.
- Classificação pediátrica por curva OMS/z-score não está implementada; o sistema
  evita aplicar faixas adultas.
- WhisperLive, whisper.cpp e Vosk estão preparados como adapters, mas não devem
  ser selecionados em produção sem implementação/validação específica.
- O replay cache do gateway é em memória por instância; múltiplas réplicas
  exigem afinidade ou store compartilhado.
- Áudio realtime não é persistido por design (`TRANSCRIPTION_SAVE_AUDIO=false`).
- Não há down migrations. Em incidente de banco, preferir forward-fix; restauração
  de backup é a última opção e implica perda dos dados gravados após o backup.

## Checklist da MR

- [x] Schema Prisma válido
- [x] Migrations versionadas e ordenadas
- [x] Seed de permissões/limites atualizado
- [ ] Reexecutar build de produção após as alterações incrementais de 15/08
- [ ] Reexecutar a suíte completa do app no CI
- [x] i18n PT/EN/ES atualizado
- [x] Documentação funcional adicionada
- [x] Guia de deploy e rollback adicionado
- [ ] Homologação visual multiusuário em staging
- [ ] Backup do banco de produção confirmado
- [ ] Variáveis e secrets de produção configurados
- [ ] Gateway/Speaches publicado com TLS e health verde
- [ ] Backfill de storage aprovado e executado
- [ ] Smoke test pós-deploy concluído
- [ ] Navegação fria para modelo recém-criado/duplicado sem 404 homologada
- [ ] Retorno contextual das páginas 404 homologado
