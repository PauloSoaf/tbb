# NutriOpus - Transcricao Automatica em Tempo Real

## Objetivo

Esta sprint entrega transcricao nativa para atendimentos online e presenciais.
O recurso usa um servico Speech-to-Text self-hosted, nao depende de Web Speech
API e nao bloqueia o atendimento quando o provider estiver indisponivel.

O fluxo salva somente segmentos finais. Audio, partials e conteudo clinico nao
sao gravados em logs de auditoria.

## Arquitetura

```text
Browser (nutricionista/paciente)
  -> token efemero HMAC, 120 s, appointment + participant
  -> gateway WebSocket NutriOpus :8010
  -> Speaches :8000
  -> faster-whisper

Browser
  -> Server Actions/Route Handler autenticado
  -> AppointmentTranscriptSegment (somente final)
  -> prontuario somente apos revisao humana
```

Responsabilidades:

- Next.js: SSR, autenticacao, tenant isolation, RBAC, settings, persistencia,
  auditoria, prontuario e metricas.
- Gateway dedicado: valida token, origem, modelo, idioma, tamanho, rate e
  encaminha o protocolo realtime.
- Speaches: inferencia STT com faster-whisper.
- Browser: captura AudioWorklet PCM16, MediaRecorder como fallback, buffer curto
  e apresentacao de partial/final.

## Provider

O provider principal e Speaches por oferecer API realtime compativel com o
protocolo OpenAI, faster-whisper, CPU/GPU, modelos dinamicos e deploy Docker.

Providers preparados:

- `speaches`: implementado.
- `mock`: implementado para testes deterministas.
- `whisper_live`: adapter preparado.
- `whisper_cpp`: adapter preparado.
- `vosk`: adapter preparado.

O atendimento depende apenas de `LiveTranscriptionProvider`. Nenhum componente
chama Speaches diretamente.

## Como executar

1. Copie os valores de `infra/transcription/.env.example` para um `.env` local
   dentro da mesma pasta.
2. Use o valor de `TRANSCRIPTION_TOKEN_SECRET` do app Next também em
   `TRANSCRIPTION_GATEWAY_HMAC_SECRET` no gateway.
3. Suba CPU:

```powershell
docker compose --env-file infra/transcription/.env `
  -f infra/transcription/docker-compose.transcription.yml `
  --profile cpu up -d --build
```

4. Para GPU NVIDIA, use `--profile gpu`.
5. Verifique:

```powershell
Invoke-RestMethod http://localhost:8001/health/live
Invoke-RestMethod http://localhost:8001/health/ready
```

O primeiro uso baixa o modelo configurado. Consulte
`infra/transcription/README.md` para smoke test real, TLS, proxy e
troubleshooting.

A imagem derivada fixa FastAPI 0.117.1 sobre Speaches 0.9.0-rc.3. FastAPI
0.118+ quebra a chamada ASGI interna usada pela transcrição realtime dessa
release; o pin foi validado com áudio PCM16 real e deve ser removido quando o
upstream corrigir essa dependência.

## Variaveis do app

```env
TRANSCRIPTION_REALTIME_PROVIDER=speaches
TRANSCRIPTION_PUBLIC_WS_URL=ws://localhost:8001/v1/realtime
TRANSCRIPTION_HTTP_URL=http://localhost:8001
TRANSCRIPTION_API_KEY=local-dev-speaches-key
TRANSCRIPTION_TOKEN_SECRET=use-at-least-32-random-bytes
TRANSCRIPTION_TOKEN_ISSUER=nutriopus
TRANSCRIPTION_TOKEN_AUDIENCE=transcription-gateway
TRANSCRIPTION_DEFAULT_MODEL=deepdml/faster-whisper-large-v3-turbo-ct2
TRANSCRIPTION_FALLBACK_MODEL=Systran/faster-whisper-small
TRANSCRIPTION_LANGUAGE=pt
TRANSCRIPTION_SAMPLE_RATE=16000
TRANSCRIPTION_CHUNK_MS=1000
TRANSCRIPTION_SAVE_AUDIO=false
```

Nenhuma chave permanente e enviada ao navegador. O token HMAC viaja no
subprotocolo WebSocket `hmac.<token>`, nunca na URL.

## Dados

Models:

- `TranscriptionSettings`
- `AppointmentTranscript`
- `AppointmentTranscriptSegment`
- `AppointmentTranscriptParticipant`
- `TranscriptionUsageCounter`
- `TranscriptSpeakerSource`

`AppointmentTranscript` aceita `appointmentId` e/ou `careSessionId`, pois uma
sala pode existir sem item de agenda legado. Todos os registros carregam
`tenantId`.

Cada segmento possui `segmentKey` unico por transcript. Reenvio apos reconexao
usa `createMany(skipDuplicates)` e nao duplica texto.

## Actions e endpoints

Server Actions:

- iniciar, pausar, retomar, parar, salvar, descartar e excluir;
- append final unitario e em lote;
- atualizar settings e testar provider;
- gerar token efemero;
- atualizar participante;
- anexar texto revisado ao prontuario.

Endpoint do paciente:

- `GET /api/transcription/patient-session`: verifica se ha sessao ativa;
- `POST action=connect`: registra ciencia e emite token do participante;
- `POST action=segments`: persiste somente finais do paciente autenticado.

O endpoint aceita sessao do portal ou token de convite valido e sempre valida
tenant, paciente, care session e transcript em conjunto.

## RBAC

Permissoes:

- `transcription.view`
- `transcription.start`
- `transcription.pause`
- `transcription.resume`
- `transcription.stop`
- `transcription.save`
- `transcription.discard`
- `transcription.delete`
- `transcription.export`
- `transcription.attachToMedicalRecord`
- `transcription.settings.view`
- `transcription.settings.edit`
- `transcription.provider.test`
- `transcription.usage.view`

Owner recebe todas. Nutritionist de equipe recebe o ciclo clinico e anexo.
Assistant, Secretary e Viewer nao recebem por padrao; override explicito pode
liberar. Global Admin acessa somente status e metricas agregadas.

## LGPD e seguranca

- Aviso visivel ao paciente online.
- Confirmacao da nutricionista no presencial.
- `ConsentRecord` para ciencia online/presencial.
- Audio nunca salvo pelo fluxo realtime.
- Partial nunca persistido.
- Conteudo nao usado para treinamento.
- Gateway sem logs de audio/transcricao e containers read-only.
- Tokens com issuer, audience, subject, tenant, appointment, participant, jti,
  escopo, modelo, idioma, origem, `iat`, `nbf` e `exp`.
- Token single-use e validade maxima de 120 segundos no gateway.
- Rate limit, limite de bytes, tamanho de chunk e origem exata.
- AuditLog registra somente ids, provider, modelo, idioma, contagens, duracao,
  estado e codigos de erro.
- Sanitizador central bloqueia chaves de texto, transcricao, resumo e audio.

## UI

- Aba Transcricao junto de Prontuario, Anamnese e Antropometria.
- Legenda partial sobre a chamada.
- Timeline de finais com busca e copia.
- Provider/captura/participantes/status.
- Pausar, retomar, parar, salvar e descartar.
- Modal de revisao antes de anexar ao prontuario.
- Configuracao por clinica em
  `/dashboard/[tenant]/configuracoes/transcricao`.
- Admin Global exibe apenas infraestrutura e uso agregado.
- PT, EN e ES usam o namespace `transcription.*`.

## Observabilidade

O gateway expoe health, readiness e metricas Prometheus. O app agrega:

- sessoes iniciadas/concluidas/falhas;
- minutos transcritos;
- segmentos finais;
- erros de provider;
- amostras e media de latencia;
- top tenants por minutos, sem paciente ou conteudo.

## Testes

Automatizados:

- contrato/registry de providers;
- Speaches: protocolo, reconexao, token e parsing;
- captura de audio e classificacao de erros;
- schemas Zod, partial proibido e lote maximo;
- gateway HMAC, replay e relay WebSocket.

Manuais online:

1. Ative a feature nas configuracoes.
2. Abra a mesma sala como nutricionista e paciente.
3. Inicie o atendimento e confirme os avisos.
4. Autorize ambos os microfones.
5. Verifique speakers separados, partial overlay e finais na timeline.
6. Pause, retome, pare e salve.
7. Revise e anexe ao prontuario.

Manuais presenciais:

1. Crie atendimento `IN_PERSON`.
2. Confirme que o paciente foi informado.
3. Autorize o microfone de sala.
4. Verifique speaker `IN_PERSON_ROOM`.
5. Finalize, revise e salve.

Provider offline:

1. Pare Speaches ou o gateway.
2. A sala deve continuar utilizavel.
3. A UI deve exibir offline/reconectando sem crash.
4. Reinicie o provider e confira reconexao/backoff.

Tenant isolation e RBAC:

1. Tente ids de transcript/care session de outro tenant nas actions.
2. O retorno deve ser generico e sem revelar existencia.
3. Teste Assistant/Secretary sem override.
4. Libere override e repita.
5. Confirme que Admin Global nao recebe segments.

## Retencao

Texto salvo segue a politica clinica/LGPD do tenant. Descartar remove segmentos e
mantem somente metadata minima do evento. Excluir exige permissao especifica.
Audio realtime nao entra na politica porque nao e persistido.

## Limitacoes conhecidas

- O modelo real nao e baixado durante CI; o smoke Speaches requer infraestrutura
  CPU/GPU e download inicial.
- Adapters WhisperLive, whisper.cpp e Vosk exigem a implementacao do protocolo
  especifico antes de selecao em producao.
- Edicao de speaker esta preparada na UI/model, mas a action dedicada pode ser
  adicionada quando houver fluxo operacional de correcao em massa.
- Resumo por IA foi intencionalmente excluido desta sprint.

## Proximos passos

- TLS `wss://` e gateway em host persistente fora da Vercel.
- Alertas externos a partir das metricas Prometheus.
- Benchmark de `medium` versus `large-v3-turbo` com audio clinico autorizado e
  anonimizado.
- Testes E2E Playwright com microfone virtual.
