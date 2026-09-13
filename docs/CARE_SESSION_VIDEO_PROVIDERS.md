# Care Session Video Providers

## Objetivo

O módulo de providers de vídeo permite que o NutriOpus suporte múltiplos modos de videoconferência para atendimentos online, sem acoplamento entre o fluxo do atendimento e a tecnologia de vídeo usada.

## Providers disponíveis

| Provider | Enum | Descrição |
|---|---|---|
| NutriOpus Nativo | `NATIVE_WEBRTC` | WebRTC peer-to-peer dentro do próprio app, sem terceiros |
| Google Meet | `GOOGLE_MEET` | Link manual ou futuro OAuth automático via Google Meet API |
| Jitsi Legado | `JITSI_LEGACY` | Iframe Jitsi (modo anterior, mantido por compatibilidade) |
| Link externo | `EXTERNAL_LINK` | Qualquer link de videoconferência externo (Zoom, Teams, etc.) |

## Arquitetura

```
NewCareSessionForm → createCareSessionAction
  → getVideoProvider(provider)
  → provider.createRoom(...)
  → prisma.careSession.update({ provider, roomId, roomUrl, ... })

CareSessionRoom → CareSessionRoomRouter
  → switch(provider) → NativeVideoRoom | GoogleMeetRoom | JitsiLegacyRoom | ExternalMeetingRoom
```

## WebRTC Signaling (NATIVE_WEBRTC)

A sinalização usa **SSE como transporte padrão** (o client não faz polling), WebSocket opcional e polling apenas como fallback emergencial. Detalhes em `CARE_SESSION_SIGNALING_SSE.md`, `CARE_SESSION_SIGNALING_WEBSOCKET.md` e `NATIVE_WEBRTC_CARE_SESSION.md`.

1. **Ambos** enviam sinais via `POST /api/care-session/[id]/signal` e recebem via `EventSource` em `GET /api/care-session/[id]/signal/stream`
2. **Nutricionista** (caller) cria `RTCPeerConnection` e envia `offer` com epoch; re-oferta quando recebe `presence joined` do paciente
3. **Paciente** (callee) responde `answer`; `ice-candidate` fluem nos dois sentidos (com fila quando chegam antes da remoteDescription)
4. Estado remoto de câmera/mic/tela via sinais `media-state`
5. Todas as rotas de signaling usam `no-store` absoluto (estado vivo nunca entra em cache)

Os sinais são armazenados na tabela `care_session_signals` com `senderRole`, `type` e `payload` JSON, ordenados de forma determinística por `createdAt` + `id`.

## STUN / TURN

- **STUN**: Configurado via `NEXT_PUBLIC_WEBRTC_STUN_URL` (padrão: `stun:stun.l.google.com:19302`)
- **TURN**: Necessário para produção em redes com NAT simétrico. Configurar `WEBRTC_TURN_URL`, `WEBRTC_TURN_USERNAME`, `WEBRTC_TURN_CREDENTIAL`

## OAuth Google

- OAuth automático com Google Meet API não está implementado no MVP
- O provider `GOOGLE_MEET` aceita link manual colado pelo nutricionista
- Para ativar OAuth: configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_MEET_SCOPES`

## Variáveis de ambiente

```env
NEXT_PUBLIC_WEBRTC_STUN_URL=stun:stun.l.google.com:19302
WEBRTC_TURN_URL=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_CREDENTIAL=
GOOGLE_MEET_ENABLED=false
GOOGLE_MEET_SCOPES=https://www.googleapis.com/auth/meetings.space.created
```

## Segurança

- A API `/api/care-session/[sessionId]/signal` valida sessão via cookie JWT
- Cada sinal é verificado pelo `nutritionistId` da sessão (multi-tenant)
- O paciente acessa a sala via token de join (sistema existente)
- Não há exposição de secrets no client

## Limitações MVP

- Stream SSE consulta o banco em loop interno (750ms) — pub/sub real (Redis/WS) fica para fase futura
- STUN público do Google — pode falhar em redes restritas (sem TURN configurado)
- Google Meet: apenas link manual (OAuth automático não implementado)
- Sem gravação automática de chamadas nativas

## Próximos passos

- [x] Substituir polling client-side por SSE (feito) — WebSocket dedicado opcional em `scripts/signaling-server.ts`
- [ ] Redis Pub/Sub para SSE multi-instância
- [ ] Configurar servidor TURN próprio (Coturn) para produção
- [ ] OAuth Google Meet para criação automática de reuniões
- [ ] Gravação de chamadas nativas via MediaRecorder API
- [ ] Transcrição automática via Whisper/Groq pós-chamada
