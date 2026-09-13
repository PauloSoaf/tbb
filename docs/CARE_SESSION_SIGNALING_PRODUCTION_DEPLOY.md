# Colocar o WebSocket de sinalização no ar em produção (www.nutriopus.com)

> **Atualizado em: 04/07/2026** · Contexto: app hospedado na **Vercel** (serverless).

## Por que isso não é automático

A Vercel não roda processos Node persistentes — cada função serverless morre depois de responder. O `scripts/signaling-server.ts` é um processo que fica **sempre no ar**, escutando conexões WebSocket. Ele **não pode rodar dentro da Vercel**. Precisa de um segundo host, separado do app.

Isso é normal e é como todo mundo faz call em tempo real sobre Vercel (Discord, Zoom-likes, etc. — todos têm um serviço de sinalização/mídia à parte).

## O problema escondido que corrigi antes de documentar

Os cookies de sessão (`nutriopus-session`, `nutriopus-patient-session`) são **host-only** — o navegador só os envia para `www.nutriopus.com`. Se o servidor WebSocket rodar em outro host (Railway, Render, um subdomínio), **o cookie nunca chega lá**. Se eu tivesse documentado "só configure a URL e pronto", a autenticação teria falhado silenciosamente em produção — mais uma sessão perdida.

**Correção implementada:** um "ticket" assinado de curta duração (60s):
1. Antes de abrir o WebSocket, o navegador faz um POST comum para `/api/care-session/[id]/signal/ticket` — isso é **mesma origem** (`www.nutriopus.com`), então os cookies funcionam normalmente ali.
2. Essa rota confere quem é (nutricionista ou paciente) do jeito de sempre, e devolve um ticket assinado.
3. O ticket vai na URL do WebSocket (`?ticket=...`), que funciona não importa em qual host o servidor WS esteja.

Testado localmente (`npx tsx scripts/smoke-signaling-server.ts`): ✓ autenticação por ticket sem nenhum cookie, incluindo bloqueio de quem tenta se passar pelo outro papel.

---

## Passo a passo

### 1. Escolha onde rodar o servidor WS

Precisa de uma plataforma que rode um **processo Node contínuo**. Recomendo, em ordem:

| Opção | Por quê |
|---|---|
| **Railway** | mais simples: conecta o repo GitHub, detecta Node, dá uma URL `wss://` própria com TLS de graça. Tier gratuito pequeno, pago é barato. |
| **Render** (Web Service) | parecido com Railway; o tier free "dorme" depois de inatividade — evite para produção real, use o pago básico. |
| **Fly.io** | mais controle, precisa da CLI `flyctl`; bom se você já usa Docker. |
| VPS (Hostinger/DigitalOcean) | mais trabalho manual (nginx + certbot para TLS), mas mais barato a longo prazo. |

Este guia assume **Railway** (mais direto). Os passos são equivalentes nas outras.

### 2. Deploy do servidor de sinalização (Railway)

1. No Railway, **New Project → Deploy from GitHub repo** → selecione o repositório do NutriOpus.
2. Em **Settings → Deploy**, configure:
   - **Root directory**: raiz do repo (o script já resolve o caminho sozinho).
   - **Build command**: `npm install`
   - **Start command**: `npx tsx scripts/signaling-server.ts`
3. Em **Variables**, adicione (copie os valores reais do seu `.env` de produção — **não** do `.env` local de dev):
   ```env
   JWT_SECRET=<o MESMO valor usado no deploy da Vercel — obrigatório>
   DATABASE_URL=<a MESMA connection string do Supabase/Postgres de produção>
   APP_URL=https://www.nutriopus.com
   SIGNALING_ALLOWED_ORIGINS=https://www.nutriopus.com,https://nutriopus.com
   ```
   O `PORT` é injetado automaticamente pelo Railway — o servidor já respeita `process.env.PORT`.
4. Deploy. Railway te dá uma URL tipo `nutriopus-signaling-production.up.railway.app` — o WebSocket fica em `wss://nutriopus-signaling-production.up.railway.app`.
5. Confirme que subiu: abra `https://<sua-url-railway>/health` no navegador → deve responder `{"ok":true,"rooms":0}`.

> **`JWT_SECRET` idêntico é obrigatório.** O servidor WS verifica a assinatura dos tickets/cookies com o mesmo segredo que a Vercel usa para assiná-los. Se forem diferentes, toda autenticação falha com 401/403 silenciosos.

### 3. Configurar a Vercel (o app)

No painel da Vercel → seu projeto → **Settings → Environment Variables**, adicione (Production):

```env
NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket
NEXT_PUBLIC_SIGNALING_WS_URL=wss://<sua-url-railway>.up.railway.app
```

**Atenção ao `wss://` (não `ws://`)**: `www.nutriopus.com` é `https`, e navegadores bloqueiam WebSocket **inseguro** (`ws://`) a partir de páginas seguras ("mixed content"). Railway/Render/Fly já entregam TLS de graça nas URLs deles — só use `wss://`.

Depois de salvar, **redeploy** o projeto na Vercel (variáveis de ambiente só entram em vigor em um novo build).

### 4. Validar em produção

1. Abra `https://www.nutriopus.com` → crie/abra um atendimento com provider **NutriOpus Nativo**.
2. Abra o link do paciente em outra aba/dispositivo.
3. DevTools → Network → filtro **WS**: deve aparecer uma conexão para a URL do Railway, status **101 Switching Protocols**.
4. Clique nela → aba **Messages** → você deve ver frames `presence`, `offer`, `answer`, `ice-candidate` fluindo.
5. Vídeo conecta dos dois lados em poucos segundos.

Se algo falhar, veja a tabela de troubleshooting abaixo.

### 5. TURN (recomendado para produção real)

STUN sozinho (já configurado) falha quando os dois lados estão atrás de NAT simétrico ou firewall corporativo — comum em redes de empresas/celular. Para produção séria, configure um TURN:

```env
NEXT_PUBLIC_WEBRTC_TURN_URL=turn:seu-turn-server:3478
NEXT_PUBLIC_WEBRTC_TURN_USERNAME=...
NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL=...
```

Opções: [coturn](https://github.com/coturn/coturn) (open source, autogerenciado) ou serviços gerenciados (Twilio TURN, Cloudflare Calls). Sem isso, algumas combinações de rede simplesmente não conectarão — o Jitsi embutido (provider "Sala Jitsi") não tem esse problema porque usa a infraestrutura TURN do `meet.jit.si`.

---

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Sem conexão WS no Network | `NEXT_PUBLIC_SIGNALING_WS_URL` errada ou build antigo na Vercel | conferir env var + redeploy |
| WS abre e fecha na hora (403) | origem não está no allow-list | conferir `SIGNALING_ALLOWED_ORIGINS`/`APP_URL` no Railway |
| WS abre e fecha na hora (401) | `JWT_SECRET` diferente entre Vercel e Railway | igualar o valor nas duas plataformas |
| `Mixed Content` no console | usando `ws://` em vez de `wss://` | trocar para `wss://` na env da Vercel |
| Conecta, mas nunca vê o outro lado | Railway "dormiu" (plano free do Render, por ex.) | usar plano que mantém o processo sempre ativo |
| Funciona na mesma rede, falha entre redes diferentes | falta TURN | configurar TURN (seção 5) ou usar provider Jitsi |
| Nada funciona e a demo é agora | — | provider **Sala Jitsi (embutida)** não depende de nada disso |

## Custo/operacional

Rodar um processo WS 24/7 tem custo (diferente de funções serverless, que só cobram por execução). Para o volume do TCC/early SaaS, o tier básico pago de Railway/Render (poucos dólares/mês) é suficiente — uma sala em memória por atendimento, sem banco no caminho quente, escala bem até algumas centenas de chamadas simultâneas num único processo.

Quando o SaaS crescer para múltiplas instâncias do servidor WS (para alta disponibilidade), salas em memória por instância deixam de bastar — nesse ponto, migre para [LiveKit](https://github.com/livekit/livekit) (self-host ou cloud) em vez de adicionar Redis Pub/Sub na sinalização própria; é o caminho de mercado para chamadas em grupo, gravação e escala horizontal real.
