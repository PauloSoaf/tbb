# Sala Nativa NutriOpus (NATIVE_WEBRTC)

## Visão geral

A sala nativa implementa videoconferência WebRTC peer-to-peer (1:1) diretamente no NutriOpus, sem serviços externos. A sinalização usa **SSE como transporte padrão** (o cliente NÃO faz polling), com WebSocket opcional e polling apenas como fallback emergencial. Ver `CARE_SESSION_SIGNALING_SSE.md` e `CARE_SESSION_SIGNALING_WEBSOCKET.md`.

## Arquivos principais

| Arquivo | Função |
|---|---|
| `src/components/care-session/native/useMediaDevices.ts` | Câmera/microfone/speaker locais, troca segura de dispositivo |
| `src/components/care-session/native/useNativeWebRTC.ts` | RTCPeerConnection, offer/answer com epoch, fila de ICE, media-state remoto |
| `src/components/care-session/native/signaling/` | Camada de signaling (types, SSE, WebSocket, polling, orquestrador) |
| `src/components/care-session/native/useScreenShare.ts` | getDisplayMedia + replaceTrack |
| `src/components/care-session/native/NativeVideoRoom.tsx` | Componente principal da sala |
| `src/components/care-session/native/NativeVideoParticipant.tsx` | Elemento de vídeo individual |
| `src/components/care-session/native/NativeVideoControls.tsx` | Botões câmera/mic/tela/desligar |
| `src/components/care-session/native/NativeDeviceSelector.tsx` | Seleção de câmera/mic/speaker |
| `src/app/api/care-session/[sessionId]/signal/route.ts` | POST (envio) + GET (fallback polling) |
| `src/app/api/care-session/[sessionId]/signal/stream/route.ts` | Stream SSE (recebimento) |
| `src/lib/care-session/signaling-server.ts` | Helpers server-side compartilhados pelas rotas |
| `scripts/signaling-server.ts` | Servidor WebSocket dedicado (opcional) |

## Fluxo de conexão

Papéis fixos (evita glare): NUTRICIONISTA = caller, PACIENTE = callee.

```
Nutricionista                              Paciente
─────────────                              ────────
1. Inicia → getUserMedia()
2. Abre SSE (EventSource /signal/stream)
3. POST presence {joined}
4. createOffer(epoch N) → POST offer
                                           5. Entra → getUserMedia()
                                           6. Abre SSE
                                           7. POST presence {joined}
8. Recebe presence joined
   → RE-OFERTA com novo epoch N+1          9. Recebe offer (epoch N+1)
                                          10. setRemoteDescription + drena fila ICE
                                          11. createAnswer → POST answer
12. Recebe answer (epoch confere)
    → setRemoteDescription + drena ICE
[ICE candidates via POST/SSE nos dois lados; chegam antes da remoteDescription → FILA]
13. ontrack → vídeo remoto + troca de media-state
```

- **Epoch**: cada negociação carrega um epoch monotônico; offers/answers/candidates de epochs antigos são ignorados (proteção contra race e base da reconexão — o caller re-oferta a cada `presence joined` do paciente).
- **Fila de ICE**: candidates que chegam antes da remoteDescription ficam em `pendingIceCandidatesRef` e são aplicados após `setRemoteDescription`.
- **Media-state**: câmera/mic/tela remotos vêm por sinal explícito `media-state` — nunca inferidos só de `track.muted`.

## Estados RTC

| Estado | Significado |
|---|---|
| `idle` | Sala não iniciada |
| `connecting` | Negociação em andamento |
| `waiting` | Aguardando o outro participante |
| `connected` | Mídia fluindo |
| `disconnected` | Outro lado saiu/caiu |
| `error` | Falha na negociação |

Também há o status de signaling (`idle/connecting/connected/reconnecting/disconnected/error`) exposto pelo orquestrador e mostrado na UI quando degradado.

## Troca de dispositivo (sem derrubar o peer)

Ordem obrigatória: `getReplacementTrack` → `replaceTrack` no sender → `commitReplacementTrack` (só aí a track antiga é parada). Se qualquer passo falhar, a track antiga continua fluindo. Camera/mic desligados permanecem desligados na track nova.

## Compartilhamento de tela

`startScreenShare()` retorna o stream (ou null) — nunca dependa de state logo após await. Parar (botão ou controle nativo do browser via `track.onended`) restaura a track da câmera SEM religar câmera que estava desligada.

## Encerramento

`handleEnd`: para screen share → `endCall` (hangup + presence left, fecha peer e canal de signaling) → para mídia local → UI encerrada. Cada etapa é best-effort: falha em uma não impede as demais. Nenhuma track fica ativa após sair.

## STUN/TURN

```ts
iceServers: [
  { urls: NEXT_PUBLIC_WEBRTC_STUN_URL ?? "stun:stun.l.google.com:19302" },
  // TURN via NEXT_PUBLIC_WEBRTC_TURN_URL/_USERNAME/_CREDENTIAL
]
```

**STUN sozinho não é suficiente para produção.** TURN é obrigatório em redes restritas (NAT simétrico, firewall corporativo). Em produção, use credenciais TURN temporárias geradas pelo backend — nunca credenciais estáticas no client.

## Cache

Sinalização é estado vivo: `no-store` absoluto em POST/GET/stream (ver "Regra permanente: Call e cache" em `SPRINT_NATIVE_CALL_SIGNALING_REFACTOR.md`).
