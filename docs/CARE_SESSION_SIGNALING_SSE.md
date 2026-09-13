# SSE Signaling

Transporte padrão de sinalização da call nativa do NutriOpus.

## Por que SSE

- Compatível com Next.js App Router Route Handlers (inclusive serverless/Vercel), ao contrário de WebSocket, que exige upgrade HTTP não garantido em route handlers.
- Remove 100% do polling client-side: o cliente mantém **um** `EventSource` aberto e recebe eventos em tempo real.
- Reconexão automática nativa do `EventSource` + backoff exponencial próprio.

## Como funciona

```
Cliente envia sinais  → POST /api/care-session/[sessionId]/signal
Cliente recebe sinais → GET  /api/care-session/[sessionId]/signal/stream (EventSource)
```

A camada é abstraída em `src/components/care-session/native/signaling/`:

- `types.ts` — tipos de sinal, payloads, helpers puros (`supportsSSE`, `compareSignals`, validadores);
- `useCareSessionSignaling.ts` — hook orquestrador (transporte + fallback + dedup por id);
- `useSseSignaling.ts` — canal SSE (padrão);
- `useWebSocketSignaling.ts` — canal WebSocket (opcional);
- `usePollingSignaling.ts` — canal polling (fallback emergencial).

`useNativeWebRTC` depende apenas do hook orquestrador, nunca de um transporte concreto.

## POST para enviar sinais

Body:

```json
{ "type": "offer", "senderRole": "NUTRITIONIST", "targetRole": "PATIENT", "payload": {} }
```

Regras do servidor (`signal/route.ts`):

- sessão/tenant validados no servidor (cookie de nutricionista OU de paciente);
- `senderRole` precisa bater com a identidade autenticada (paciente só age como PATIENT, nutricionista só como NUTRITIONIST);
- `nutritionistId` NUNCA vem do client;
- `type` validado contra a lista de tipos permitidos;
- persistência com ordenação determinística (`createdAt` + `id`).

## EventSource para receber sinais

`GET /signal/stream` responde `text/event-stream` com eventos:

```
event: signal
data: {"id":"...","type":"offer","senderRole":"PATIENT","payload":{...},"createdAt":"..."}

event: heartbeat
data: {"ts":"2026-07-03T12:00:00.000Z"}
```

- O stream envia apenas sinais do OUTRO participante, posteriores ao cursor.
- Cursor: `?after=<createdAt>&afterId=<id>`; na reconexão o cliente retoma do último sinal recebido (nenhum sinal se perde no gap).
- Sem cursor, o stream começa em "agora". Perder a offer pré-join é seguro por design: o caller **re-oferta** ao receber o `presence joined` do outro lado.
- Cursor composto `createdAt + id` evita perder/duplicar sinais com o mesmo timestamp.
- Encerramento correto no abort do request (`request.signal`), limpando os intervals.

## No-store obrigatório

Sinalização é estado vivo. As duas rotas usam:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
// + Cache-Control: no-store, no-cache, must-revalidate (e proxy-revalidate no POST/GET)
```

Nada de offer/answer/ICE/presence/media-state/hangup pode passar por Router Cache, Data Cache, CDN ou proxy. O fetch de envio usa `cache: "no-store"`.

## Heartbeat

- Servidor → cliente: evento `heartbeat` a cada 15s (mantém proxies/load balancers de manter a conexão viva e serve de liveness).
- Cliente → servidor: sinal `presence {status:"heartbeat"}` a cada 15s durante a call.

## Presence

- `presence {status:"joined"}` ao entrar na sala;
- `presence {status:"left"}` + `hangup` ao sair;
- o caller (nutricionista) re-negocia (nova offer com novo epoch) sempre que recebe `joined` do paciente — é isso que torna reconexão determinística.

## Limitações

- O servidor ainda consulta o banco em loop interno (750ms) por stream aberto. Aceitável para beta 1:1; não é pub/sub real.
- Streams SSE longos podem ser derrubados por proxies agressivos (mitigado pelo heartbeat + reconexão com cursor).
- Em serverless, cada stream ocupa uma invocação de função durante a vida da conexão (atenção a timeout de função na Vercel — o EventSource reconecta sozinho com cursor).

## Produção multi-instância

Com várias instâncias, o loop de consulta ao banco continua funcionando (o banco é o barramento comum), mas a latência e a carga crescem. Para escala real:

1. Redis Pub/Sub: publicar o sinal no POST e assinar o canal `care-session:<id>` dentro do stream SSE (remove o loop de consulta);
2. ou servidor WebSocket dedicado (ver `CARE_SESSION_SIGNALING_WEBSOCKET.md`).

## Próxima evolução: Redis Pub/Sub ou WebSocket server

Fase futura documentada em `SPRINT_NATIVE_CALL_SIGNALING_REFACTOR.md`: Redis Pub/Sub para fan-out multi-instância, TURN com credenciais temporárias geradas pelo backend e métricas de qualidade da conexão.
