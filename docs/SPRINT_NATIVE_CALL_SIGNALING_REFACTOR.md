# Sprint: Correção Call Nativa WebRTC + SSE/WebSocket Signaling

Data: 2026-07-03

## Objetivo

Corrigir bugs de mídia e TypeScript da call nativa e substituir o polling client-side por uma arquitetura de signaling moderna: SSE como transporte padrão, WebSocket opcional, polling apenas como fallback emergencial, `no-store` absoluto para todo estado vivo da chamada.

## Arquitetura final

```
NativeVideoRoom            UI, status, fullscreen, PiP, botões, eventos, device selector
useMediaDevices            câmera, microfone, speaker, stream local, switch seguro
useNativeWebRTC            RTCPeerConnection, offer/answer com epoch, fila de ICE, media-state remoto
useCareSessionSignaling    orquestrador SSE / WebSocket / polling + dedup + fallback
useScreenShare             getDisplayMedia + replaceTrack + retorno seguro p/ câmera
NativeVideoParticipant     render local/remoto, avatar por media-state, setSinkId
```

## Entregas

1. **Signaling layer** (`src/components/care-session/native/signaling/`): types + 3 transportes + orquestrador com fallback websocket→sse→polling e dedup por id.
2. **API**: `signal/route.ts` (POST/GET fallback) endurecida (validação de type/role, no-store, cursor determinístico `createdAt+id`) e novo `signal/stream/route.ts` (SSE com heartbeat 15s, cursor, abort cleanup).
3. **WebSocket opcional**: `scripts/signaling-server.ts` (ws, rooms, ping/pong) — desativado por padrão.
4. **useMediaDevices**: guard `unsupported`, novo stream antes de parar o antigo, `getReplacementTrack`/`commitReplacementTrack`/`switchDevice` (replaceTrack antes de parar track antiga), preservação de cameraOn/micOn, mapa completo de erros.
5. **useNativeWebRTC**: epochs de negociação (re-offer determinístico no presence joined), fila de ICE candidates, replaceVideo/AudioTrack seguros, media-state remoto, heartbeat, cleanup total.
6. **useScreenShare**: retorna stream/boolean explícitos, `onended` do browser, não religa câmera desligada, callbacks started/stopped.
7. **NativeVideoParticipant**: bug de initials corrigido, `remoteCameraOn/remoteMicOn` via media-state (não depende de `track.muted`), i18n "Você", `setSinkId` com fallback, cleanup de vídeo.
8. **NativeVideoRoom**: screen share sem state stale, envio de media-state em toda mudança, `NativeDeviceSelector` integrado, encerramento com cleanup completo, aviso de signaling degradado.
9. **i18n**: 21 chaves novas × 3 idiomas (status/erros/participants/devices).
10. **Testes**: helpers de mídia, tipos de signaling, fila de ICE, initials, clamp de volume.

## Regra permanente: Call e cache

Cache inteligente NÃO se aplica ao signaling ou live state da chamada.

Pode cachear:
- shell da página;
- nome do paciente;
- nome da nutricionista;
- dados mínimos da sessão;
- breadcrumb;
- arquivos recentes com TTL curto.

Não pode cachear:
- offer;
- answer;
- ICE candidates;
- presence;
- heartbeat;
- media-state;
- screen share state;
- hangup;
- mensagens de signaling.

## TURN/STUN

- STUN sozinho NÃO é suficiente para produção (falha em NAT simétrico/firewalls corporativos).
- TURN é obrigatório em redes restritas: `NEXT_PUBLIC_WEBRTC_TURN_URL/_USERNAME/_CREDENTIAL`.
- Em produção, credenciais TURN devem ser temporárias e geradas pelo backend (nunca estáticas no client).

## Próximos passos (fases futuras)

1. WebSocket server dedicado com Redis Pub/Sub.
2. TURN credentials temporárias geradas pelo backend.
3. Métricas de qualidade da conexão (RTCStats).
4. Reconnection strategy robusta (ICE restart automático).
5. Chamada em grupo (SFU).
6. Gravação com consentimento.
7. Transcrição em tempo real.
8. Background blur.
9. Troca avançada de dispositivo (preview antes de aplicar).
10. Whiteboard e compartilhamento de arquivos durante a call.
