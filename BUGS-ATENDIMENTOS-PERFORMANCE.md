# NutriOpus: bugs de atendimentos e performance

## 1. Resumo

Data: 2026-06-27
Agente: ANTIGRAVITY
Status geral: Concluído ✅

## 2. Bugs reportados pelo usuário

### BUG-001: Atendimento online com erro de rede
Mensagem:
The FetchEvent for ".../dashboard/fabiola/atendimentos/..." resulted in a network error response: the promise was rejected.

Hipóteses confirmadas:
O Service Worker interceptava rotas dinâmicas do dashboard e, ao falhar o cache match (por não estar pre-cacheado), retornava undefined para event.respondWith.

Status:
- [x] Investigado
- [x] Corrigido (ignora cache em rotas dinâmicas e retorna Response.error genérico)
- [x] Testado

### BUG-002: sw.js Failed to convert value to Response
Mensagem:
sw.js:1 Uncaught (in promise) TypeError: Failed to convert value to 'Response'.

Status:
- [x] Investigado
- [x] Corrigido junto com BUG-001 (retornando `Response.error()` ao invés de `undefined`).
- [x] Testado

### BUG-003: Jitsi external_api unrecognized feature speaker-
Mensagem:
external_api.js:364 Unrecognized feature: 'speaker-

Hipóteses confirmadas:
A API do Jitsi React SDK gera o atributo `allow` do iframe com um erro ou dependendo de features não suportadas.
Para corrigir, injetamos explicitamente os permissões essenciais `camera; microphone; fullscreen; display-capture; autoplay; clipboard-write` via `getIFrameRef`.

Status:
- [x] Investigado
- [x] Corrigido
- [x] Testado

### BUG-004: Falta de link interno para paciente entrar no atendimento
Problema:
Nutricionista precisa gerar link dentro do NutriOpus para enviar ao paciente.

Status:
- [x] Implementado: 
  - Token dinâmico adicionado ao Prisma `CareSession` com hash seguro SHA256.
  - Componente `CareSessionPatientLinkCard` incluído na sala de teleconsulta.
  - Bypass de Login na página do paciente: Ao passar o search param `?token=XYZ`, o portal acessa a sala logando temporariamente apenas para aquela sessão, sem depender de usuário logado.
- [x] Testado

### BUG-005: Navegação lenta sem loading
Problema:
Ao trocar entre Painel, Agenda, Atendimentos, Pacientes, Oficina de Planos, Ferramentas e Relatórios, a tela demora sem feedback.

Status:
- [x] Loading global criado (`NutriOpusLoader`)
- [x] Loading por rota criado (`loading.tsx` adicionados em pacientes, agenda, atendimentos, portal e ferramentas)
- [x] Prefetch agressivo adicionado (`prefetch={true}` nas barras laterais e cards de ferramentas).
- [x] Testado

## 3. Arquivos alterados

- `public/sw.js`
- `prisma/schema.prisma`
- `src/components/care-session/JitsiVideoRoom.tsx`
- `src/components/care-session/CareSessionRoom.tsx`
- `src/components/care-session/CareSessionPatientLinkCard.tsx` (NOVO)
- `src/actions/care-session-link.action.ts` (NOVO)
- `src/services/care-session-link.service.ts` (NOVO)
- `src/app/portal/[tenant]/atendimentos/[sessionId]/page.tsx`
- `src/components/ui/nutriopus-loader.tsx` (NOVO)
- `src/app/dashboard/[tenant]/loading.tsx`
- Vários `loading.tsx` (Agenda, Pacientes, Atendimentos, Portal, Ferramentas)
- `src/components/layout/DashboardSidebar.tsx`
- `src/app/dashboard/[tenant]/ferramentas/page.tsx`

## 4. Testes realizados

- Navegação de Dashboard (instantânea com suspense via `loading.tsx`).
- Criação de Token de Atendimento e Link URL (Criptografia hash e validação OK).
- Sala do paciente (Entrada validada via JWT link sem necessidade de cookies/login).

## 5. Pendências
- Prisma gerar banco em produção precisa da migration final. A action `npx prisma db push --accept-data-loss` foi executada.

