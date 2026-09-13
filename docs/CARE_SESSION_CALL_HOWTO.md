# Call de Atendimento — Arquitetura, Setup e Testes

> **Atualizado em: 04/07/2026** · Autor: Claude (sessão de correção da call nativa)

## TL;DR — rode isto agora

```bash
# Terminal 1 — servidor de sinalização WebSocket (OBRIGATÓRIO para a call nativa)
npm run signaling

# Terminal 2 — o app
npm run dev
```

Depois **feche as abas antigas** e abra de novo (ou Ctrl+Shift+R). Sem Prisma migrate, sem Supabase — o schema não mudou.

> Se não quiser rodar dois terminais: crie o atendimento com o provider **"Sala Jitsi (embutida)"** — funciona sempre, sem servidor extra.

---

## 1. Respostas às suas perguntas (04/07/2026)

### "É porque testei no mesmo notebook/navegador?"

**Não — seu teste era válido.** Duas abas do mesmo Chrome (dashboard + portal) funcionam: o Chrome compartilha a câmera entre abas e os cookies de nutricionista e paciente têm nomes diferentes (`nutriopus-session` / `nutriopus-patient-session`), então coexistem.

Cuidados reais ao testar em uma máquina só:
- **Dois navegadores diferentes** (Chrome + Edge) ao mesmo tempo: no Windows a câmera costuma ser **exclusiva por processo** — o segundo navegador pode falhar com "dispositivo em uso". Prefira duas abas do mesmo navegador, ou aba normal + anônima.
- Teams/Zoom/OBS abertos podem prender a câmera.
- O vídeo local aparecer preto na miniatura ≠ falha de conexão — a conexão é o signaling + WebRTC, não a câmera.

### Por que ficava "aguardando" dos dois lados?

Juntando todos os seus prints: **toda request para `/api/care-session/*/signal*` ficava "pending" para sempre** (POST, GET e stream), enquanto o resto do app respondia 200. Ou seja: o servidor Next travava especificamente nessa rota. Causa mais provável: os **streams SSE zumbis** de sessões anteriores — cada um rodava uma query Prisma a cada 750ms, para sempre, acumulando conexões até esgotar o pool do Prisma/Supabase. A partir daí, qualquer nova query na rota de signal enfileirava eternamente.

**Solução definitiva (implementada hoje):** tirar o signaling do Next e do banco → **servidor WebSocket dedicado**, com salas em memória. O banco é consultado **uma única vez por conexão** (para autorizar), nunca no caminho quente.

### "Google Meet dentro da plataforma por iframe?"

**Não é possível — é um bloqueio do Google, não nosso.** O `meet.google.com` envia `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors`, que fazem o navegador **recusar** renderizar o Meet dentro de iframe de outro site. Não existe contorno legítimo; o caminho oficial do Google é o [Meet Add-ons SDK](https://developers.google.com/meet/add-ons) (você embute seu app NO Meet, não o contrário).

O que a plataforma oferece:
- **Google Meet** (provider): guarda o link, botão "Abrir Google Meet" em nova aba — o único jeito compatível.
- **Sala Jitsi (embutida)** (provider): a experiência "Meet dentro da plataforma" de verdade — o [Jitsi Meet](https://github.com/jitsi/jitsi-meet) é open source, **permite** embed e tem [IFrame API oficial documentada](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/). Já integrado via `meet.jit.si` (gratuito, sem chave de API).

---

## 2. Arquitetura da call nativa

```
┌─────────────┐   WebSocket (ws://localhost:3001)   ┌─────────────┐
│ Nutricionista│◄───────────────────────────────────►│  Paciente   │
│  (browser)  │      scripts/signaling-server.ts     │  (browser)  │
└──────┬──────┘         salas em memória             └──────┬──────┘
       │                                                    │
       └───────────── WebRTC P2P (áudio/vídeo) ─────────────┘
                    STUN (+ TURN em produção)
```

- **Mídia** (áudio/vídeo): WebRTC ponto a ponto, nunca passa pelo servidor.
- **Sinalização** (offer/answer/ICE/presença/media-state): WebSocket dedicado.
- **Negociação**: papéis fixos (nutricionista = caller, paciente = callee), épocas monotônicas contra race conditions, fila de ICE candidates até a remote description chegar, re-offer automático a cada 10s enquanto não conecta (self-heal) — padrão adaptado do [Perfect Negotiation da MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation).

### Transportes (abstração `useCareSessionSignaling`)

| Transporte | Quando usar | Estado |
|---|---|---|
| **websocket** (padrão atual) | dev e produção self-host | ✅ implementado + smoke test |
| polling | fallback automático se o WS cair | ✅ implementado |
| sse | só `next start`/self-host (quebra no `next dev`) | ✅ implementado, não recomendado |

Se o servidor WS não estiver rodando, o client cai sozinho para polling após ~3 tentativas (o polling usa as rotas Next + banco — funciona, mas com a latência e os riscos já conhecidos).

### Segurança do servidor WS (`scripts/signaling-server.ts`)

- **Autenticação obrigatória** no handshake, validada no banco (1 query por conexão):
  1. `?token=` do link do paciente → SHA-256 comparado com `patientJoinTokenHash` + expiração;
  2. cookie `nutriopus-session` (JWT) → sessão precisa pertencer à nutricionista;
  3. cookie `nutriopus-patient-session` (JWT) → sessão precisa bater com `patientId` + `nutritionistId`.
- **Role carimbada pelo servidor** — cliente não consegue se passar pelo outro lado (testado no smoke test).
- Allow-list de `Origin`, tipos de sinal validados, payload máximo 256KB, ping/pong a cada 20s, presença "left" automática quando a aba fecha.
- Cookies funcionam em localhost porque cookie é por **host** (porta é ignorada) — `localhost:3000` → `localhost:3001` envia os cookies normalmente.

### Variáveis (.env — já configuradas)

```env
NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket
NEXT_PUBLIC_SIGNALING_WS_URL=ws://localhost:3001
SIGNALING_SERVER_PORT=3001
```

---

## 3. Roteiro de teste (passo a passo)

1. **Terminal 1**: `npm run signaling` → deve logar `listening on ws://localhost:3001`.
2. **Terminal 2**: `npm run dev`.
3. (Opcional) Valide o relay de ponta a ponta sem browser:
   ```bash
   npx tsx scripts/smoke-signaling-server.ts
   # ✓ unauthenticated client rejected
   # ✓ both roles authenticated and joined the room
   # ✓ offer relayed nutritionist → patient with server-stamped senderRole
   ```
4. Aba 1 (nutricionista): dashboard → Atendimentos → abrir/criar atendimento **NutriOpus Nativo** → "Iniciar atendimento" → "Iniciar chamada".
5. Aba 2 (paciente, mesmo navegador): portal do paciente → Consultas → mesmo atendimento → "Entrar na consulta" → "Entrar na chamada".
6. **Como verificar que está funcionando** (DevTools → Network → filtro **WS**):
   - deve existir **1 conexão websocket** para `localhost:3001/care-session/...` em cada aba, status 101;
   - clique nela → aba Messages → você vê os frames `presence`, `offer`, `answer`, `ice-candidate` fluindo em tempo real;
   - em poucos segundos o vídeo remoto aparece dos dois lados, com toast "entrou".
7. Teste: mute/câmera (o outro lado vê o estado), compartilhar tela, sair e voltar (reconecta sozinho pelo re-offer), fechar a aba do paciente (nutricionista recebe "saiu" na hora, via presença automática do servidor).

### Troubleshooting

| Sintoma | Causa | Correção |
|---|---|---|
| Sem conexão WS no Network | servidor de sinalização não está rodando | `npm run signaling` no terminal 1 |
| WS conecta e cai (401) | sessão expirada / cookie ausente | relogar; paciente usar o link com `?token=` |
| Conecta mas sem vídeo entre redes diferentes | falta TURN (NAT simétrico) | configurar `NEXT_PUBLIC_WEBRTC_TURN_*` (obrigatório em produção) |
| "Dispositivo em uso" | outro navegador/app segurando a câmera | fechar o outro app; usar duas abas do mesmo navegador |
| Nada funciona e a demo é agora | — | provider **Sala Jitsi (embutida)** — sempre funciona |

---

## 4. Pesquisa — referências open source usadas/recomendadas

| Projeto | O que é | Por que importa aqui |
|---|---|---|
| [MDN Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) | padrão oficial de negociação WebRTC | base da nossa negociação (adaptada p/ papéis fixos) |
| [jitsi/jitsi-meet](https://github.com/jitsi/jitsi-meet) | vídeo-conferência open source completa | já embutida como provider "Sala Jitsi" (IFrame API) |
| [livekit/livekit](https://github.com/livekit/livekit) | SFU open source (Go) com SDKs excelentes | **caminho recomendado para o SaaS escalar** (grupo, gravação, transcrição em tempo real); tem cloud com tier gratuito |
| [coturn/coturn](https://github.com/coturn/coturn) | servidor TURN open source | obrigatório para produção entre redes restritas |
| [ws](https://github.com/websockets/ws) | WebSocket server Node | usado no nosso servidor de sinalização |

**Recomendação honesta para o futuro SaaS:** a sinalização própria atual é adequada para 1:1 e para o TCC. Quando precisar de chamadas em grupo, gravação ou transcrição em tempo real, migre a mídia para **LiveKit** (self-host ou cloud) em vez de evoluir SFU próprio — é o padrão de mercado open source.

---

## 5. Registro do que foi feito (04/07/2026)

1. **Servidor WS endurecido** (`scripts/signaling-server.ts`): auth JWT/token com validação no banco, role derivada no servidor, allow-list de origin, validação de tipos, ping/pong, presença "left" automática no disconnect, endpoint `/health`, carregamento de `.env` standalone.
2. **Client**: token do paciente no handshake WS; fallback do WS vai **direto para polling** (SSE pulado de propósito — pode "conectar" e nunca entregar no `next dev`).
3. **Smoke test E2E** (`scripts/smoke-signaling-server.ts`): rejeição de não-autenticado, join dos dois papéis, relay com role carimbada — **passou**.
4. **`.env`**: transporte padrão → `websocket` + URL + porta. **npm script**: `npm run signaling`.
5. **Jitsi promovido** a opção estável de primeira classe (formulário de novo atendimento reordenado, banner neutro, altura corrigida para preencher a sala).
6. **Google Meet**: documentado o bloqueio de iframe pelo Google; provider continua com link + nova aba (único caminho compatível).
7. Verificação: `tsc` 0 erros, 54/54 testes da call passando.

### Histórico das causas-raiz (para a monografia)

| Data | Bug | Causa raiz |
|---|---|---|
| 03/07 | 401 no signaling do paciente | rota só aceitava cookie de nutricionista |
| 03/07 | vídeo preto | ICE candidates chegando antes do offer (sem fila) + stream remota sem nova referência p/ o React |
| 03/07 | rejoin não reconectava | peer não era recriado em novo offer (resolvido com épocas) |
| 04/07 | tudo "pending" infinito | SSE bufferizado no `next dev` + streams zumbis esgotando o pool do Prisma |
| 04/07 | **solução definitiva** | signaling fora do Next/banco → WebSocket dedicado em memória |
