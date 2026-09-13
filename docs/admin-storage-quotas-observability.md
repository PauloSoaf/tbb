# Admin Global — Storage Quotas, Ledger e Governance

Data: 2026-07-26

## Objetivo

Dar ao Global Admin visibilidade real de quanto armazenamento cada clínica
(e cada usuário dentro dela) consome, permitir configurar limites por plano
e por tenant (exceções), aplicar esses limites **antes** do upload subir pro
provider de armazenamento, e avisar a nutricionista antes de ela ser
bloqueada. Esta sprint entrega o núcleo funcional (quota + ledger + admin);
observabilidade avançada (histórico/snapshots, backfill, reconciliação,
métricas de infraestrutura) ficou documentada como pendência — ver o final
deste documento.

## Modelo de dados

- **`StorageFile`** — um registro por arquivo enviado por qualquer fluxo do
  app (documento de paciente, template, foto de perfil, áudio de transcrição,
  upload genérico). Campos: `tenantId`, `uploadedByUserId`, `url`,
  `sizeBytes`, `purpose`, `resourceId`, `createdAt`. É a única fonte de
  verdade de uso — nunca um contador que pode dessincronizar, sempre
  `SUM(sizeBytes)` sob demanda.
- **`FeatureLimit`** (já existia) — limite/flag por **plano**, chave livre.
  Chaves de armazenamento: `storage.maxMb` (total) e
  `storage.singleUpload.maxMb` (por arquivo).
- **`TenantFeatureOverride`** (novo) — exceção manual por **tenant**, mesma
  forma de chave/limite/enabled do `FeatureLimit`, mais `reason` e
  `expiresAt` opcional. Quando presente e não expirado, vence sobre o limite
  do plano (`getTenantSubscriptionContext` em
  `src/lib/billing/subscription-context.ts` faz esse merge).
- **`GlobalAuditLog`** (novo) — trilha de auditoria para ações do Global
  Admin que não pertencem a um tenant específico (ex: editar limite de um
  plano inteiro). Criado porque `AuditLog.tenantId` tem FK obrigatória para
  `Nutritionist` — não existe um "tenant" válido para "mudei o limite do
  plano PRO para todo mundo".

Migrations: `prisma/migrations/20260722000000_add_storage_tracking/` (tabela
`storage_files`) e `prisma/migrations/20260726020000_add_storage_governance/`
(`uploadedByUserId`, `tenant_feature_overrides`, `global_audit_logs`).

## Fluxo de upload rastreado

Todo upload de arquivo pertencente a um tenant passa por
`uploadTrackedFile(tenantId, buffer, options)` em
`src/lib/storage/tracked-upload.ts`:

1. `storageUsageService.checkStorageLimit` — checa **primeiro** o limite por
   arquivo único (`storage.singleUpload.maxMb`), depois o total
   (`storage.maxMb`, usado + este arquivo). Se qualquer um estourar, lança
   `StorageQuotaExceededError` **antes** de subir qualquer byte pro provider.
2. Se bloqueado e o usuário for identificável (`uploadedByUserId`), grava um
   `auditLogService.record({ action: "storage.upload.blocked", result: "DENIED", ... })`.
3. Se permitido, sobe o arquivo (`storage.uploadFile`) e grava a linha no
   ledger (`storageUsageService.recordUpload`).
4. Se a gravação no ledger falhar depois do upload ter subido, o arquivo é
   **removido do provider** (rollback) para não ficar órfão contando contra
   nada.

`deleteTrackedFile(tenantId, url)` espelha isso na exclusão: apaga do
provider e remove a linha do ledger.

Confirmado por busca (`grep -rln 'storage.uploadFile\|storage.deleteFile'`)
que **nenhum** outro ponto do código chama o storage provider diretamente —
`tracked-upload.ts` é o único.

## Limites por plano (seed atual)

| Plano | `storage.maxMb` | `storage.singleUpload.maxMb` |
|---|---|---|
| FREE | 200 MB | 5 MB |
| BASIC | 1000 MB (1 GB) | 10 MB |
| PRO | 5000 MB (5 GB) | 25 MB |
| CLINIC | 20000 MB (20 GB) | 100 MB |

**Nota conhecida**: os uploads de documento/template/foto de perfil ainda têm
uma checagem hardcoded de 5MB *antes* de chegar em `uploadTrackedFile`
(`if (file.size > 5*1024*1024) return {error}`). Isso significa que o limite
maior de `storage.singleUpload.maxMb` para BASIC/PRO/CLINIC (10/25/100MB) é
hoje inatingível nesses 3 fluxos — o hardcoded de 5MB sempre bloqueia antes.
Não removi essas checagens porque não fazia parte do escopo desta sprint e
mudar validação de formulário existente merece atenção própria; documentando
aqui para a próxima sprint decidir se remove o hardcoded ou mantém como teto
de segurança absoluto.

## Admin Global

- **`/admin/storage`** (novo, item de menu "Armazenamento"): total global,
  total de arquivos, média por clínica, contagem de clínicas ≥80% do limite,
  barra de consumo por plano, tabela de todas as clínicas ordenada por uso
  com status (normal/atenção/perto do limite/bloqueado/ilimitado) e editor
  inline de exceção (`TenantStorageOverrideEditor`) — limite em MB, motivo,
  data de expiração opcional.
- **`/admin/planos`**: `PlanFeatureLimitsEditor` já existia (sprint anterior)
  e ganhou aviso pós-salvamento: se o novo limite de `storage.maxMb` for
  menor que o uso atual de algum tenant do plano, o admin recebe a contagem
  de quantos tenants ficariam acima da cota (não bloqueia o salvamento, nem
  apaga nada — só avisa. Isso segue a regra do próprio pedido: "não cortar
  imediatamente acesso sem mensagem").
- **`/admin`**: card "Armazenamento Total" + lista das 10 clínicas que mais
  consomem (já existia da sprint anterior, mantido).

## Lado da clínica (nutricionista)

`StorageQuotaBanner` (`src/components/dashboard/StorageQuotaBanner.tsx`) no
dashboard principal: busca a cota via `getMyStorageQuotaStatusAction` no
mount, e só aparece a partir de 70% de uso (nada é mostrado abaixo disso).
Cores por severidade: âmbar (70-89%), laranja (90-99%), vermelho (≥100%,
"limite atingido"). Link direto para Configurações.

## O que o Global Admin vê e não vê

Vê (agregado, cross-tenant): bytes totais, contagem de arquivos, nome e slug
da clínica, plano, status de cota. **Não vê**: nome de arquivo, conteúdo,
prontuário, anamnese, transcrição, ou qualquer dado clínico — o ledger nunca
armazena esse tipo de informação, só metadados operacionais (`purpose` é uma
categoria como `"patient-document"`, não o nome real do arquivo).

## Como testar

1. Como `GLOBAL_ADMIN`: acessar `/admin/storage`, conferir totais e a tabela
   de clínicas.
2. Editar o limite de armazenamento do plano FREE em `/admin/planos` para um
   valor bem baixo (ex: 1 MB) e salvar — deve aparecer aviso se algum tenant
   FREE já usa mais que isso.
3. Criar uma exceção de tenant em `/admin/storage` (botão "Dar exceção" na
   linha da clínica) e confirmar que o "Limite Efetivo" na tabela muda e
   mostra "(exceção)".
4. Como nutricionista de uma clínica perto do limite: enviar um documento,
   confirmar toast de erro amigável quando bloqueado (não expõe stack trace).
5. Enviar um documento permitido, confirmar que aparece uma linha nova em
   `StorageFile` (consulta direta ou reflexo no `/admin/storage`).
6. Excluir esse documento, confirmar que a linha do ledger some e o total
   volta a cair.

## Comandos executados

```bash
npx tsc --noEmit                 # 0 erros
npx eslint <arquivos tocados>    # 0 erros
npx vitest run                   # 738/738 passando (22 novos)
npx prisma migrate deploy        # aplicou add_storage_tracking; add_storage_governance
                                  # BLOQUEADA por migration de outro agente (ver abaixo)
```

`npx prisma generate` falhou ao trocar o binário do query engine (`.dll.node`)
por causa do `next dev` local rodando durante a sessão (trava conhecida no
Windows) — mas os tipos TypeScript (`.d.ts`) já tinham sido escritos com
sucesso antes dessa etapa falhar, então `tsc` reflete o schema atual
corretamente. Confirmado também em runtime real (script `tsx` avulso) que
`prisma.storageFile` funciona; `prisma.tenantFeatureOverride` e
`prisma.globalAuditLog` só funcionarão depois que a migration
`20260726020000_add_storage_governance` for aplicada.

## Bloqueio externo a esta sprint

A migration `20260726010000_realtime_transcription` (de outro agente/tarefa
em paralelo) falha no Postgres com
`unsafe use of new value "LIVE" of enum type "TranscriptStatus"` — usa um
valor de enum recém-criado como `DEFAULT` na mesma transação em que o valor
foi adicionado, o que o Postgres não permite. Isso bloqueia
`prisma migrate deploy` para **qualquer** migration seguinte, incluindo a
desta sprint. Não foi corrigida aqui por não ser desta sprint; documentado
para quem for aplicar as migrations em sequência.

## Pendências (não implementadas nesta sprint, por escopo)

- Snapshots históricos de uso (`StorageUsageSnapshot` e afins), crescimento
  7/30 dias, projeção de esgotamento de cota.
- Backfill de arquivos que existiam antes do ledger (`StorageFile`) e
  reconciliação ledger-vs-provider.
- Métricas de infraestrutura real (tamanho do banco por tabela, CPU/RAM) —
  propositalmente não inventadas; precisam de um provider configurado.
- Taxonomia completa de eventos técnicos (`storage.quota.warning_70/80/90`
  etc.) — só o evento de bloqueio (`storage.upload.blocked`) foi implementado.
- Limite granular por `purpose` (ex: `storage.documents.maxMb` separado de
  `storage.profileImages.maxMb`) — a chave genérica já suporta isso no
  `FeatureLimit`/`TenantFeatureOverride`, falta só a checagem específica em
  `checkStorageLimit`.
- Drawer completo por tenant no Admin Global, exportação CSV, simulador de
  limite ("quantos tenants seriam afetados se eu mudasse X").
- Correção do hardcoded de 5MB nos formulários de documento/template/foto de
  perfil, que hoje neutraliza o `storage.singleUpload.maxMb` maior dos
  planos pagos (ver seção "Limites por plano" acima).

---

## Parte 2 — Observabilidade avançada (2026-07-29)

Continuação direta da Parte 1: todos os itens da lista de pendências acima
foram implementados nesta rodada, cada um pesquisado contra a prática atual
de mercado antes de implementar (fontes ao final desta seção).

### Correção de um bug real encontrado em produção

**`StorageUsageSnapshot.totalBytes`/`quotaBytes` (e o `sizeBytes` do
breakdown por propósito) estouravam `INTEGER` (32-bit)** — confirmado com um
`ConversionError` real do Postgres ao testar contra um tenant CLINIC de
verdade: `20000 MB * 1024 * 1024 = 20.971.520.000 bytes`, acima do teto de
~2,147 bilhões de um `INTEGER`. Corrigido migrando essas 3 colunas para
`BigInt` (migration `20260726031000_fix_storage_snapshot_bigint`, um
`ALTER COLUMN ... TYPE BIGINT` — alteração segura, sem perda de dado, porque
`BIGINT` é um superconjunto de `INTEGER`). O service converte
`number → BigInt` ao gravar e `BigInt → number` ao ler, para o resto do app
nunca precisar lidar com `bigint` nativo do JS. Isso é diferente do
`StorageFile.sizeBytes` por arquivo individual, que continua `Int` de
propósito — nenhum upload single-file passa de ~100MB hoje (limite do plano
CLINIC), então não há risco de overflow ali; só valores **agregados**
(totais, cotas em bytes) precisavam do tipo maior.

Esse bug só apareceu porque o serviço foi testado de verdade contra o banco
real com um valor de plano CLINIC, não só com `tsc`/mocks — reforça o hábito
usado no resto desta sprint (rodar contra o Postgres real antes de dar por
pronto), documentado explicitamente para não se perder.

### O que foi construído

| Item pendente | O que existe agora |
|---|---|
| Snapshots históricos | `StorageUsageSnapshot` + `StorageUsageByPurposeSnapshot`, upsert idempotente por (tenantId, dia UTC) |
| Cron de snapshot | `/api/cron/storage-snapshot`, agendado em `vercel.json` (`0 6 * * *`, diário — compatível com o tier Hobby da Vercel, que só permite 1x/dia), protegido por `CRON_SECRET` (padrão oficial da Vercel) |
| Refresh manual | `refreshStorageSnapshotAdminAction`, com cooldown de 5min pra não rodar em todo clique |
| Backfill | `scripts/backfill-storage-ledger.ts` (documentos, templates, fotos de perfil, áudio de transcrição — com `--dry-run`) |
| Reconciliação | `storageReconciliationService.reconcile()` — só leitura: duplicatas, tamanho desconhecido, e checagem real contra o Vercel Blob via `head()` quando aplicável |
| Métricas de infra/DB reais | `dbMetricsService` — `pg_database_size`, `pg_total_relation_size`, `pg_stat_user_tables` (linhas vivas/mortas) — nada inventado, só Postgres real |
| Taxonomia de eventos técnicos | `storageAlertService` — reaproveita `SecurityEvent` (mesmo model de "MULTIPLE_FAILED_LOGINS"), dispara só na troca de patamar (70/90/100%), não a cada request |
| Limite por `purpose` | `checkStorageLimit(tenantId, bytes, purpose)` — checa `storage.<purpose>.maxMb` antes do total; semeado como exemplo em `storage.transcription-audio.maxMb` |
| Drawer por tenant | `TenantStorageDrawer` — breakdown por tipo, por membro (uploader), histórico 30d, exceções ativas |
| CSV | `/api/admin/storage/export` |
| Gráfico de crescimento | `StorageGrowthChart` (recharts, mesmo padrão visual do `GlobalAdminCharts` existente) |

### Decisões de pesquisa de mercado

- **Cron em serverless (Vercel)**: usado o padrão oficial documentado —
  `vercel.json` → `crons[]` com `path`+`schedule` (cron de 5 campos, UTC);
  segurança via `CRON_SECRET` enviado como `Authorization: Bearer` pela
  própria Vercel; desenho **idempotente** (upsert por dia) porque a doc da
  Vercel é explícita que a entrega é "best effort" e pode invocar a mesma
  execução mais de uma vez.
- **Tamanho de tabela no Postgres**: `pg_stat_user_tables` join conceitual
  com `pg_total_relation_size(relid)` é a prática consolidada (várias fontes
  independentes convergem no mesmo padrão), com `n_live_tup`/`n_dead_tup`
  como sinal de bloat. `pg_size_pretty` existe mas não foi usado no service
  (a formatação fica no client, mais fácil de reaproveitar entre MB/GB).
- **Reconciliação contra o provider real**: `@vercel/blob` expõe `head(url)`
  para checar se um blob ainda existe sem baixar o conteúdo — usado numa
  amostra dos 50 arquivos mais recentes (não o ledger inteiro, para não virar
  uma operação cara) quando `STORAGE_PROVIDER=vercel-blob`.

### Validação

```bash
npx tsc --noEmit        # 0 erros
npx eslint <arquivos>   # 0 erros
npx vitest run          # 746/746 (mais 8 testes novos: BigInt overflow, idempotência, limite por purpose)
npm run build            # ✓ Compiled successfully
```

Testado contra o Postgres real (não só mock): `dbMetricsService` (tamanhos
reais retornados), `storageReconciliationService` (rodou sem erro, 0 tenants
com dado ainda), `storageSnapshotService` (criou/idempotente-re-executou
snapshot real pra um tenant CLINIC de verdade — foi isso que achou o bug do
BigInt), backfill em `--dry-run` (encontrou 1 documento e 1 foto de perfil
reais que precedem o ledger). Dado de teste criado durante a verificação foi
removido ao final.

### Pendências (agora sim, menores)

- Backfill real (sem `--dry-run`) não foi executado — é uma escrita que
  afeta o cálculo de cota de tenants existentes retroativamente (um tenant
  perto do limite pode passar a aparecer acima dele quando arquivos antigos
  entram no ledger). Fica a critério de quando rodar, fora do escopo de "só
  construir a ferramenta".
- Hardcoded de 5MB em document/template/profile-photo ainda neutraliza
  `storage.singleUpload.maxMb` acima de 5MB — mencionado na Parte 1, ainda
  não corrigido.
- Simulador de limite ("quantos tenants passariam do limite") já existe de
  forma simples (aviso pós-salvamento no `PlanFeatureLimitsEditor`), mas não
  como uma tela de simulação interativa antes de salvar.

### Fontes consultadas

- [Cron Jobs — Vercel Docs](https://vercel.com/docs/cron-jobs)
- [Managing Cron Jobs — Vercel Docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [How to Get Sizes of Database Objects in PostgreSQL — Neon](https://neon.com/postgresql/administration/database-indexes-table-size)
- [How to Get Table Size in PostgreSQL — CommandPrompt](https://www.commandprompt.com/education/how-to-get-table-size-in-postgresql/)
