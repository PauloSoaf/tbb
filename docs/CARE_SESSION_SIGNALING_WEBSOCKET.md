# WebSocket Signaling

Transporte OPCIONAL de sinalização da call nativa. Desativado por padrão (o padrão é SSE — ver `CARE_SESSION_SIGNALING_SSE.md`).

## Quando usar

- Deploy self-hosted / Node custom (Docker, VPS, PM2) onde é possível manter um processo dedicado.
- Necessidade de latência mínima de sinalização e envio bidirecional pelo mesmo socket.
- Escala multi-instância em conjunto com Redis Pub/Sub (fase futura).

## Por que não usar direto em Route Handler serverless

Route Handlers do Next.js (especialmente em Vercel/serverless) não garantem o upgrade HTTP → WebSocket nem conexões longas persistentes por invocação. Por isso o servidor WS roda como **processo separado**.

## Servidor dedicado

`scripts/signaling-server.ts` (usa `ws`):

```bash
SIGNALING_SERVER_PORT=3001 npx tsx scripts/signaling-server.ts
```

- Path: `ws://host:3001/care-session/:sessionId?role=NUTRITIONIST|PATIENT`
- O servidor carimba `id`, `createdAt` e força `senderRole` da conexão em cada frame (o client não consegue falsificar o papel do outro lado).

## Rooms por sessionId

Cada conexão entra na room da sua `sessionId`; todo frame é retransmitido apenas para os OUTROS participantes da mesma room. Room é removida quando fica vazia.

## Ping/pong

- Servidor: `ws.ping()` a cada 20s; conexões sem `pong` são terminadas.
- Cliente (`useWebSocketSignaling.ts`): frame `{"type":"ping"}` a cada 20s; reconexão com backoff exponencial; após falhas consecutivas faz fallback automático para SSE.

## Segurança

Estado atual (beta): o servidor NÃO valida cookies de sessão. Antes de usar em produção:

1. rodar atrás do mesmo reverse proxy/origem do app;
2. validar um token curto de join (ex.: token assinado gerado pelo backend com sessionId+role+exp) no handshake;
3. rejeitar roles inválidas (já feito) e limitar 1 conexão por role por room;
4. TLS (`wss://`) obrigatório.

## Variáveis de ambiente

```env
# Ativar WebSocket como transporte:
NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket
NEXT_PUBLIC_SIGNALING_WS_URL=ws://localhost:3001
SIGNALING_SERVER_PORT=3001
```

Sem essas variáveis o app usa SSE. Se o WS falhar em runtime, o orquestrador (`useCareSessionSignaling`) degrada sozinho para SSE e, em último caso, polling.

## Dependências

`ws` (runtime do servidor dedicado) e `@types/ws` (dev) foram adicionados ao package.json nesta sprint. O client usa a API `WebSocket` nativa do browser — nenhuma dependência extra no bundle.
