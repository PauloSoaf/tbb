# Deploy das mudanças atuais — guia operacional

Este guia cobre o deploy das mudanças sem commit da branch
`fix/beta-version-bugs` em 15/08/2026. Ele assume PostgreSQL/Supabase, aplicação
Next.js na Vercel, Vercel Blob e serviços persistentes fora da Vercel para
WebSocket.

## Resultado esperado

Ao final, o ambiente terá:

- banco com nove migrations novas;
- catálogo de permissões, planos e limites atualizado;
- app Next.js publicado;
- uploads persistentes e contabilizados por tenant;
- navegação com feedback assíncrono padronizado, retorno 404 contextual e
  abertura do Estúdio sem reutilizar cache negativo de rotas recém-criadas;
- snapshot diário de storage;
- gateway de transcrição + Speaches acessíveis por TLS;
- sinalização WebRTC existente validada;
- smoke tests de Admin, clínica, PDF, antropometria e transcrição concluídos.

## Ordem segura

```text
Backup e staging
  -> validar variáveis
  -> aplicar migrations
  -> executar seed-permissions
  -> subir/validar gateway + Speaches
  -> publicar o app na Vercel
  -> validar cron e uploads
  -> executar backfill dry-run
  -> aprovar/executar backfill real
  -> smoke tests e monitoramento
```

Não dependa do build da Vercel para migrar o banco. O script `npm run build`
executa `prisma generate`, mas não executa `prisma migrate deploy` nem o seed.

## 1. Pré-requisitos e janela de mudança

Antes de iniciar:

1. Homologue a branch em staging com uma cópia anonimizada ou banco de staging.
2. Confirme backup/PITR do PostgreSQL e teste que a restauração é possível.
3. Reserve uma janela de manutenção curta para migrations e seed.
4. Confirme acesso ao projeto Vercel, banco, Blob e host Docker da transcrição.
5. Confirme que o serviço de sinalização WebRTC existente está saudável.
6. Separe os domínios finais, por exemplo:

   - app: `https://www.nutriopus.com`;
   - sinalização: `wss://signal.nutriopus.com`;
   - transcrição: `wss://transcription.nutriopus.com/v1/realtime`.

7. Gere secrets independentes; não reutilize `JWT_SECRET`, HMAC da transcrição,
   chave do Speaches e `CRON_SECRET`.

Exemplo de geração:

```bash
openssl rand -base64 48   # TRANSCRIPTION_TOKEN_SECRET / HMAC
openssl rand -base64 48   # SPEACHES_API_KEY, diferente do HMAC
openssl rand -base64 32   # CRON_SECRET
```

## 2. Variáveis da aplicação/Vercel

Configure para Production e, idealmente, Preview/Staging com valores separados.

### Obrigatórias para o núcleo

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<segredo-longo-existente>
NEXT_PUBLIC_APP_URL=https://www.nutriopus.com
GLOBAL_ADMIN_EMAIL=<email-real-do-global-admin>
```

- `DATABASE_URL`: conexão otimizada/pooler para o runtime serverless.
- `DIRECT_URL`: conexão direta ou session-capable com permissão de DDL, usada
  pelo Prisma Migrate. Não use uma URL que bloqueie migrations.
- `NEXT_PUBLIC_APP_URL` deve coincidir com a origem pública e com os redirects
  OAuth.
- `GLOBAL_ADMIN_EMAIL` deve ser definido explicitamente antes do seed. O script
  possui um e-mail default de desenvolvimento e não deve depender dele em
  produção.

### Storage persistente

```env
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=<token-do-store>
UPLOAD_MAX_SIZE_MB=5
```

Na Vercel, `STORAGE_PROVIDER=local` grava em filesystem efêmero e causa perda de
arquivos. O build atual emitiu exatamente esse aviso no ambiente local.

Conecte um store Vercel Blob ao projeto e aos ambientes que realmente publicarão
uploads. O token deve vir da integração/painel da Vercel e permanecer somente
nas variáveis protegidas do ambiente (ou em `.env.local` quando alguém optar por
testar Blob localmente). Não copie o valor para documentação, código, variável
`NEXT_PUBLIC_*`, logs ou commit. Preview e Production devem usar o store/token
deliberadamente escolhidos para cada ambiente.

Em desenvolvimento local, a ausência de `BLOB_READ_WRITE_TOKEN` seleciona o
provider `local` por padrão e grava sob `/uploads`; isso é aceitável para testes
locais, mas não representa persistência de deploy. Para produção, configure
explicitamente `STORAGE_PROVIDER=vercel-blob` e valide que o aviso sobre uploads
locais desapareceu.

`UPLOAD_MAX_SIZE_MB` é um teto legado de alguns fluxos; os limites comerciais
continuam vindo de `FeatureLimit`/override.

### Cron

```env
CRON_SECRET=<segredo-aleatorio-com-pelo-menos-16-caracteres>
```

O endpoint falha fechado quando o secret não existe. A Vercel envia
`Authorization: Bearer <CRON_SECRET>` automaticamente ao executar o cron.

### Transcrição realtime no app

```env
TRANSCRIPTION_REALTIME_PROVIDER=speaches
TRANSCRIPTION_PUBLIC_WS_URL=wss://transcription.nutriopus.com/v1/realtime
TRANSCRIPTION_WS_URL=wss://transcription.nutriopus.com/v1/realtime
TRANSCRIPTION_HTTP_URL=https://transcription.nutriopus.com
TRANSCRIPTION_API_KEY=<opcional-se-o-proxy-proteger-health>
TRANSCRIPTION_TOKEN_SECRET=<mesmo-HMAC-do-gateway>
TRANSCRIPTION_TOKEN_ISSUER=nutriopus
TRANSCRIPTION_TOKEN_AUDIENCE=transcription-gateway
TRANSCRIPTION_DEFAULT_MODEL=deepdml/faster-whisper-large-v3-turbo-ct2
TRANSCRIPTION_FALLBACK_MODEL=Systran/faster-whisper-small
TRANSCRIPTION_LANGUAGE=pt
TRANSCRIPTION_SAMPLE_RATE=16000
TRANSCRIPTION_CHUNK_MS=1000
TRANSCRIPTION_SAVE_AUDIO=false
TRANSCRIPTION_MAX_RECONNECT_ATTEMPTS=5
TRANSCRIPTION_PROVIDER_HEALTHCHECK_INTERVAL_SECONDS=30
```

Defina `TRANSCRIPTION_PUBLIC_WS_URL` explicitamente. O runtime tem fallback local
e ele não é apropriado para produção.

O valor de `TRANSCRIPTION_TOKEN_SECRET` deve ser idêntico ao
`TRANSCRIPTION_GATEWAY_HMAC_SECRET` do gateway. Issuer e audience também devem
coincidir.

### Sinalização WebRTC existente

Na Vercel:

```env
NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket
NEXT_PUBLIC_SIGNALING_WS_URL=wss://signal.nutriopus.com
NEXT_PUBLIC_WEBRTC_STUN_URL=stun:stun.l.google.com:19302
NEXT_PUBLIC_WEBRTC_TURN_URL=turn:...
NEXT_PUBLIC_WEBRTC_TURN_USERNAME=...
NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL=...
```

TURN é necessário para confiabilidade em NAT simétrico, rede corporativa e
algumas redes móveis. Sem TURN, a aplicação pode funcionar em uma rede e falhar
entre redes diferentes.

### Integrações condicionais

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=NutriOpus <no-reply@dominio-verificado>
GROQ_API_KEY=...
AI_PROVIDER=groq
AI_MODEL=...
AI_API_KEY=...
```

- Cadastre no Google a redirect URI exata:
  `https://www.nutriopus.com/api/auth/google/callback`.
- Sem credenciais Google, a UI mostra a integração indisponível.
- Sem `RESEND_API_KEY`, o build passa, mas convites e e-mails não são enviados.
- IA pode permanecer desabilitada caso o provider não esteja homologado.

## 3. Aplicar as migrations

Execute em uma máquina segura/CI com as variáveis do ambiente de destino. Não
use `prisma migrate dev` em produção e não substitua as migrations por
`prisma db push`.

```powershell
npm ci
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Ordem esperada:

1. `20260719000000_add_billing_limits`
2. `20260722000000_add_storage_tracking`
3. `20260726005000_extend_transcript_status`
4. `20260726010000_realtime_transcription`
5. `20260726020000_add_storage_governance`
6. `20260726030000_add_storage_snapshots`
7. `20260726031000_fix_storage_snapshot_bigint`
8. `20260729070000_clinical_meal_plan_upgrade`
9. `20260815090000_meal_plan_library`

Não una as migrations `05000` e `10000`: a separação evita o erro do PostgreSQL
ao adicionar e usar um novo valor de enum na mesma transação.

O comando executado durante esta revisão encontrou 28 migrations e informou que
o banco apontado pelo `.env` local estava atualizado. Isso não prova o estado de
staging ou produção; rode `migrate status` com as URLs de cada ambiente.

Em desenvolvimento no Windows, pare o `npm run dev` antes de gerar o Client. O
processo do Next pode manter `query_engine-windows.dll.node` bloqueado e deixar
uma instância antiga do Prisma em memória:

```powershell
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

Esse é o fluxo normal para abrir o projeto local depois que as migrations já
estão versionadas:

1. `npm run prisma:generate` atualiza o Client usado pelo código;
2. `npm run prisma:deploy` aplica, em ordem, somente migrations pendentes;
3. `npm run dev` inicia o servidor de desenvolvimento com compilação sob demanda,
   hot reload e sem exigir uma pasta `.next` de produção.

Use `npm run prisma:migrate` apenas ao **criar** uma nova migration em ambiente
de desenvolvimento. Não o use para um deploy normal e nunca em produção.

Para servir localmente em modo de produção, gere a build antes de iniciar:

```powershell
npm run build
npm start
```

Use os scripts npm; `next build` não é um comando global do PowerShell.

`npm start` não compila, não aplica migrations, não gera o Prisma Client e não
oferece hot reload. Ele apenas serve uma build de produção já existente em
`.next`; sem `npm run build`, falha com “Could not find a production build”.
Para desenvolvimento diário use `npm run dev`. Quando precisar simular
produção localmente, pare o dev server e execute, nesta ordem:

```powershell
npm run prisma:deploy
npm run build
npm start
```

`npm run build` já executa `prisma generate`, portanto não é necessário gerar o
Client uma segunda vez nessa sequência de produção.

## 4. Executar o seed correto

Depois das migrations:

```powershell
$env:GLOBAL_ADMIN_EMAIL = "admin@seu-dominio.com"
npx tsx prisma/seed-permissions.ts
```

O script faz upsert de:

- catálogo de permissões, incluindo `transcription.*`;
- permissões padrão por papel;
- planos FREE/BASIC/PRO/CLINIC;
- feature limits de pacientes, equipe, PDF, storage e transcrição;
- papel `GLOBAL_ADMIN` para o e-mail configurado, caso o usuário já exista.

Valide no banco ou na UI:

- quatro planos ativos;
- chaves `storage.maxMb`, `storage.singleUpload.maxMb` e
  `transcription.minutes.monthly` por plano;
- 14 permissões `transcription.*`;
- usuário correto como `GLOBAL_ADMIN`.

Não execute `npm run prisma:seed` em produção. Esse script é o seed de demo e
cria/atualiza `teste@nutriopus.com` com senha conhecida.

## 5. Subir a infraestrutura de transcrição

### Requisitos

- host persistente com Docker Engine e Compose v2;
- cerca de 4 GB livres para imagens/cache inicial;
- GPU NVIDIA + NVIDIA Container Toolkit para o profile GPU;
- reverse proxy/load balancer com TLS e suporte a WebSocket;
- saída de rede para baixar modelos do Hugging Face.

GPU é o profile recomendado para latência realtime. CPU serve para staging,
desenvolvimento e operação degradada, mas o modelo grande pode não acompanhar
fala ao vivo em hardware modesto.

### Configurar o host

```powershell
Set-Location infra/transcription
Copy-Item .env.example .env
```

No `.env` do host, no mínimo:

```env
NODE_ENV=production
TRANSCRIPTION_GATEWAY_HMAC_SECRET=<mesmo-TRANSCRIPTION_TOKEN_SECRET-da-Vercel>
SPEACHES_API_KEY=<segredo-diferente-do-HMAC>
GATEWAY_ALLOWED_ORIGINS=["https://www.nutriopus.com","https://nutriopus.com"]
GATEWAY_REQUIRE_ORIGIN=true
GATEWAY_ALLOW_QUERY_TOKEN=false
GATEWAY_TOKEN_ISSUER=nutriopus
GATEWAY_TOKEN_AUDIENCE=transcription-gateway
GATEWAY_TOKEN_SINGLE_USE=true
GATEWAY_METRICS_BEARER_TOKEN=<segredo-para-metricas>
GATEWAY_BIND_ADDRESS=127.0.0.1
GATEWAY_PUBLIC_PORT=8001
TRANSCRIPTION_DEFAULT_MODEL=deepdml/faster-whisper-large-v3-turbo-ct2
TRANSCRIPTION_FALLBACK_MODEL=Systran/faster-whisper-small
TRANSCRIPTION_SAVE_AUDIO=false
```

Use `127.0.0.1` quando o reverse proxy está no mesmo host. Em outra topologia,
o gateway pode escutar na interface privada necessária, mas a porta plaintext
nunca deve ficar exposta diretamente à internet.

### Profile GPU

```powershell
docker run --rm --gpus all nvidia/cuda:12.6.3-base-ubuntu24.04 nvidia-smi
docker compose -f docker-compose.transcription.yml --profile gpu up -d --build
docker compose -f docker-compose.transcription.yml --profile gpu ps
```

### Profile CPU

```powershell
docker compose -f docker-compose.transcription.yml --profile cpu up -d --build
docker compose -f docker-compose.transcription.yml --profile cpu ps
```

Use apenas um profile. O primeiro start pode levar vários minutos porque os
modelos são baixados antes de o healthcheck ficar verde.

### Reverse proxy/TLS

O proxy deve:

- publicar `https://transcription.nutriopus.com` e `wss://.../v1/realtime`;
- encaminhar upgrade WebSocket e os subprotocolos;
- preservar o header `Origin`;
- bloquear acesso direto ao Speaches;
- limitar `/metrics` ou exigir bearer token;
- manter timeouts compatíveis com sessões longas.

O navegador nunca recebe `SPEACHES_API_KEY`; somente o gateway acessa o
container Speaches pela rede Docker privada.

### Validar a infraestrutura

```powershell
Invoke-RestMethod https://transcription.nutriopus.com/health/live
Invoke-RestMethod https://transcription.nutriopus.com/health/ready

docker compose -f docker-compose.transcription.yml exec -T transcription-gateway-gpu `
  node scripts/check-provider.mjs

docker compose -f docker-compose.transcription.yml exec -T transcription-gateway-gpu `
  node scripts/smoke-realtime.mjs
```

Troque o nome do serviço para `transcription-gateway-cpu` no profile CPU.

O smoke deve confirmar handshake autenticado e evento final de transcrição. Os
logs não devem conter token, áudio, texto transcrito, paciente ou tenant.

## 6. Verificar a sinalização WebRTC

Se o servidor já está publicado, apenas valide. Caso ainda não esteja, siga
[CARE_SESSION_SIGNALING_PRODUCTION_DEPLOY.md](./CARE_SESSION_SIGNALING_PRODUCTION_DEPLOY.md).

No host de sinalização, confirme:

```env
JWT_SECRET=<mesmo-JWT_SECRET-da-Vercel>
DATABASE_URL=<banco-de-producao>
APP_URL=https://www.nutriopus.com
SIGNALING_ALLOWED_ORIGINS=https://www.nutriopus.com,https://nutriopus.com
```

Health esperado:

```text
GET https://signal.nutriopus.com/health
-> {"ok":true,"rooms":0}
```

## 7. Publicar o app na Vercel

Somente depois de banco, seed e transcrição estarem prontos:

1. Configure todas as variáveis Production no painel da Vercel.
2. Conecte o Vercel Blob e confirme o token no mesmo ambiente.
3. Confirme que `vercel.json` foi incluído no deploy.
4. Faça o deploy/redeploy da branch.
5. Verifique o build. Esperado: `prisma generate` + `next build` concluídos.
6. Abra os logs e confirme ausência dos avisos:

   - `storage is using local uploads in production`;
   - `RESEND_API_KEY is not defined`, se e-mail faz parte do ambiente.

7. Confirme as rotas novas:

   - `/admin/storage`;
   - `/api/admin/storage/export`;
   - `/api/cron/storage-snapshot`;
   - `/api/meal-plans/images`;
   - `/api/transcription/patient-session`;
   - `/dashboard/<tenant>/configuracoes/transcricao`.

8. Faça uma navegação fria para
   `/dashboard/<tenant>/ferramentas/oficina-planos/<mealPlanId>` e confirme que
   o skeleton do segmento aparece enquanto o Estúdio carrega.

As correções de 404/cache do Estúdio são de aplicação: a URL é produzida pelo
builder canônico, e criação/duplicação invalidam a rota exata do novo ID. A
migration da biblioteca continua obrigatória para habilitar refeições/alimentos
salvos, mas não deve ser tratada como correção de uma URL incorreta. O lookup do
plano permanece limitado ao tenant autenticado e à permissão `mealPlans.edit`.

O cron roda às 06:00 UTC, equivalente a 02:00 em Manaus. O desenho é
idempotente e suporta invocação repetida no mesmo dia.

## 8. Backfill do ledger de storage

Novos uploads passam a ser rastreados imediatamente. Arquivos antigos só entram
na cota após o backfill.

Primeiro, dry-run no ambiente de destino:

```powershell
npx tsx scripts/backfill-storage-ledger.ts --dry-run
```

Revise:

- quantidade por documentos, templates, fotos e áudio legado;
- linhas com tamanho desconhecido;
- tenants que passariam de 70%, 90% ou 100%;
- disponibilidade das URLs para requisição `HEAD`.

Depois de aprovação e comunicação aos tenants afetados:

```powershell
npx tsx scripts/backfill-storage-ledger.ts
```

O script é idempotente e ignora URLs já presentes. Arquivos cujo tamanho não
pode ser determinado entram com `sizeBytes=0`; use a reconciliação em
`/admin/storage` para revisar esses casos.

Após o backfill, crie um snapshot manual no Admin ou invoque o cron autenticado:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Headers $headers `
  https://www.nutriopus.com/api/cron/storage-snapshot
```

Uma chamada sem secret ou com secret incorreto deve retornar 401.

## 9. Smoke test pós-deploy

### Admin Global

1. Entrar com `GLOBAL_ADMIN_EMAIL` e confirmar redirect para `/admin`.
2. Abrir `/admin/tenants`, buscar e trocar plano com confirmação.
3. Abrir `/admin/planos`, revisar/editar feature limits e o aviso de impacto.
4. Abrir `/admin/storage`, validar gráfico, tabela, drawer, override, snapshot,
   reconciliação e CSV.
5. Confirmar que métricas de transcrição não exibem conteúdo clínico.

### Clínica e billing

1. Cadastrar paciente e confirmar toast/redirect.
2. Atingir limites de paciente/equipe/PDF em um tenant de staging.
3. Confirmar que override de tenant vence o limite do plano e expira na data.
4. Verificar banner de storage nos patamares 70/90/100%.

### Uploads e plano alimentar

1. Enviar/remover documento, template, foto de perfil e imagem de plano.
2. Tentar arquivo acima do limite individual e acima da cota total.
3. Confirmar que arquivo bloqueado não chega ao Blob.
4. Criar plano, configurar logo/marca-d'água/paginação e gerar PDF.
5. Reabrir o plano e confirmar persistência de imagens, alt, legenda e medida.
6. Salvar uma refeição e um alimento na biblioteca; reabrir o plano e confirmar
   as abas `Refeições`/`Alimentos`.
7. Reordenar alimentos e mover um deles para outra refeição; salvar, recarregar
   e confirmar ordem, nutrientes e nova refeição.
8. Duplicar um modelo e clicar imediatamente em “Abrir no Estúdio”; confirmar
   spinner no botão, loading da rota e abertura do ID novo sem 404.
9. Durante salvar/duplicar/aplicar/excluir, confirmar que apenas a ação remota
   correspondente fica busy e que drag, seleção e edição local não são
   bloqueados desnecessariamente.

### Navegação e páginas de erro

1. Abrir uma URL inexistente sob `/dashboard/<tenant>` e confirmar que “Voltar
   ao dashboard” retorna a `/dashboard/<tenant>`, não ao site público.
2. Repetir sob `/portal/<tenant>` e `/admin`, validando os respectivos inícios.
3. Acionar links internos em Admin, pacientes, avaliações e Oficina; confirmar
   spinner/barra superior, `aria-busy` e proteção contra clique repetido.
4. Confirmar que `Ctrl`/`Cmd` + clique, nova aba, download e links externos
   continuam com o comportamento nativo do navegador.

### Antropometria

1. Criar avaliação adulta, idosa e infantil.
2. Confirmar IMC/referência adequada e ausência de classificação adulta em
   criança.
3. Testar RCQ, cintura/estatura e protocolos de dobras.
4. Alterar valores derivados no request e confirmar recálculo no servidor.

### Transcrição

1. Em configurações, habilitar somente em tenant de staging.
2. Abrir a mesma consulta como nutricionista e paciente em dois navegadores.
3. Confirmar aviso/ciência e permissão de microfone dos dois lados.
4. Validar partial, finais, speakers, pause/resume/stop/save.
5. Revisar e anexar ao prontuário; testar export/delete conforme papel/plano.
6. Derrubar o gateway e confirmar que a consulta continua funcionando.
7. Restaurar o gateway e confirmar reconexão com novo token single-use.
8. Validar consulta presencial e confirmação do paciente informado.

### OAuth e e-mail

1. Conectar Google Agenda e validar retorno à âncora correta.
2. Repetir callback com state inválido e confirmar rejeição.
3. Disparar convite/e-mail e confirmar entrega no domínio verificado.

## 10. Monitoramento inicial

Nas primeiras 24–48 horas, acompanhar:

- erros 5xx e tempo de resposta na Vercel;
- falhas do cron e presença de snapshots diários;
- `SecurityEvent` de storage 70/90/100%;
- drift no relatório de reconciliação;
- crescimento das maiores tabelas PostgreSQL;
- health/readiness e reinícios de gateway/Speaches;
- erros de provider, latência e minutos transcritos agregados;
- uso de GPU, memória, temperatura e disco/cache de modelos;
- falhas OAuth e envio de e-mail;
- negações RBAC inesperadas.

Alertas mínimos recomendados:

- readiness da transcrição falhando por 2 minutos;
- reinício recorrente do Speaches/gateway;
- aumento de `upstream_failures_total` ou rate limits;
- cron sem snapshot por mais de 26 horas;
- tenants acima de 90% de storage;
- banco, Blob ou host Docker perto do limite de capacidade.

## 11. Rollback e contenção

Não existem down migrations. Evite rollback destrutivo do banco.

Em incidente:

1. Congele novos deploys e preserve logs/evidências.
2. Desabilite transcrição nos tenants/planos afetados ou mantenha o gateway
   offline; a consulta deve continuar sem STT.
3. Para quota incorreta, aplique override temporário ou limite ilimitado; não
   apague ledger/arquivos para “corrigir” contagem.
4. Desabilite o cron removendo o agendamento em um redeploy controlado; não
   exponha o endpoint sem secret.
5. Faça rollback do deployment da Vercel somente após confirmar compatibilidade
   do código anterior com o schema novo.
6. Prefira forward-fix para schema e dados.
7. Restaure backup apenas em falha grave e com aceite explícito da perda de
   dados posterior ao ponto restaurado.

Depois da contenção, repita `prisma migrate status`, smoke tests e reconciliação
antes de reabrir a feature.

## Checklist final

- [ ] Backup/PITR confirmado
- [ ] Staging homologado
- [ ] Variáveis Production revisadas por duas pessoas
- [ ] `prisma migrate deploy` concluído
- [ ] `prisma migrate status` sem pendências
- [ ] `seed-permissions.ts` concluído com e-mail correto
- [ ] Blob persistente configurado
- [ ] `STORAGE_PROVIDER=vercel-blob` ativo sem aviso de storage local
- [ ] Gateway/Speaches ready por TLS
- [ ] Sinalização WebRTC healthy
- [ ] Build/deploy Vercel concluído
- [ ] Cron autenticado e snapshot criado
- [ ] Backfill dry-run revisado
- [ ] Backfill real aprovado/executado
- [ ] Smoke tests concluídos
- [ ] Modelo recém-criado/duplicado abre no Estúdio sem 404
- [ ] Loading por ação e retorno contextual das páginas 404 homologados
- [ ] Alertas e monitoramento ativos
