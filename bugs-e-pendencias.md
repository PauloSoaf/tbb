# NutriOpus — Bugs e Pendências

> **Arquivo criado por:** ANTIGRAVITY | **Data:** 2026-06-27
> 
> **Propósito:** Mapear problemas que NENHUMA IA consegue resolver sozinha — requerem acesso humano (painel de serviços externos, chaves de API reais, deploy, credenciais).
> 
> **Regra:** Só adicionar aqui itens que confirmadamente bloqueiam funcionalidade e que precisam do usuário ou de acesso externo não disponível no ambiente de dev.

---

## 🔴 CRÍTICO — Requer ação humana imediata

### BUG-001 — Variáveis de ambiente não configuradas em produção
**Status:** PENDENTE  
**Afeta:** MÚLTIPLAS funcionalidades (Email, WhatsApp, IA, Google Calendar, Upload)  
**Descrição:** O `.env` de produção (Vercel/servidor) não tem todas as variáveis obrigatórias. Funcionalidades que falham silenciosamente:

| Variável | Funcionalidade afetada | Comportamento sem ela |
|---|---|---|
| `RESEND_API_KEY` | Emails transacionais | Emails não são enviados (simulado) |
| `GROQ_API_KEY` | IA análise anamnese + análise paciente | Botões de IA retornam erro 500 |
| `EVOLUTION_API_URL` | WhatsApp lembretes | Cron dispara mas não envia nada |
| `EVOLUTION_API_KEY` | WhatsApp lembretes | Idem |
| `GOOGLE_CLIENT_ID` | Google Calendar OAuth | Botão "Conectar Google Agenda" falha |
| `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth | Idem |
| `CRON_SECRET` | Proteção do endpoint de cron | Endpoint acessível sem autenticação |
| `NEXT_PUBLIC_APP_URL` | Links de ativação, WhatsApp, convites | Links gerados apontam para localhost |

**Ação necessária:** Configurar essas variáveis no painel do Vercel (ou do servidor de hospedagem).

---

### BUG-002 — Migration do campo `gender` em Patient (CODEX Sprint AAHA)
**Status:** PENDENTE (migration pendente em produção)  
**Afeta:** Cadastro/edição de pacientes  
**Descrição:** CODEX adicionou o campo `gender` ao modelo `Patient` e criou a migration `20260627150000_add_patient_gender`. O `db push` já aplicou a alteração no banco de dev via Supabase, mas a migration SQL gerada pode precisar ser confirmada/aplicada manualmente se o ambiente usar `prisma migrate deploy`.  
**Verificar:** Executar `npx prisma migrate status` para confirmar que não há drift.  
**Ação necessária:** Confirmar status da migration no ambiente de produção.

---

## 🟡 MÉDIO — Funcionalidade parcial / comportamento inesperado

### BUG-003 — iCal feed não inclui `startTime` correto para consultas sem horário
**Status:** RESOLVIDO por CLAUDE_CODE em 2026-06-27  
**Afeta:** `/api/calendar/sync`  
**Fix aplicado:** `src/app/api/calendar/sync/route.ts` — regex `/^\d{1,2}:\d{2}$/` valida formato antes de parsear, guard `isNaN` protege contra strings vazias e valores fora de range (0–23h, 0–59m). Fallback: 09:00 para start, 60min de duração.

### BUG-004 — Push Notifications PWA não implementadas
**Status:** PENDENTE (feature não iniciada)  
**Afeta:** Portal do paciente — lembretes e notificações  
**Descrição:** O PWA está instalável (manifest + SW), mas o Service Worker não implementa Web Push. Lembretes e mensagens do nutricionista chegam apenas via WhatsApp/email.  
**Bloqueia IA?** Requer configuração do VAPID key no servidor + cadastro no backend. Parte pode ser codada por IA, mas a geração das VAPID keys é manual.  
**Ação necessária:** Usuário deve gerar VAPID keys (`npx web-push generate-vapid-keys`) e adicionar ao `.env`.

### BUG-005 — Upload de arquivos em produção usa armazenamento local
**Status:** PENDENTE (configuração de produção)  
**Afeta:** Todos os uploads de documentos e imagens de pacientes  
**Descrição:** `STORAGE_PROVIDER=local` funciona apenas em dev. Em produção (Vercel), o filesystem é efêmero — arquivos enviados são perdidos no próximo deploy.  
**Ação necessária:** Configurar `STORAGE_PROVIDER=vercel-blob` + `BLOB_READ_WRITE_TOKEN` no Vercel.

---

## 🟢 BAIXO — Melhorias desejáveis / UX minor

### BUG-006 — Aviso de depreciação `package.json#prisma`
**Status:** RESOLVIDO em 2026-06-27 por CODEX  
**Afeta:** Build output (não afeta funcionalidade)  
**Descrição:** Prisma 6 avisa que a configuração `package.json#prisma` será depreciada no Prisma 7. Não quebra nada agora.  
**Ação:** Migrar para `prisma.config.ts` quando atualizar para Prisma 7 (não urgente).

### BUG-007 — Vitest avisa sobre `vite-tsconfig-paths`
**Status:** RESOLVIDO por CODEX em 2026-06-27  
**Afeta:** Output dos testes (não afeta funcionalidade)  
**Fix aplicado:** `vitest.config.ts` usa `resolve: { tsconfigPaths: true }` nativo do Vite/Vitest; plugin `vite-tsconfig-paths` removido do `package.json`.

### BUG-008 — Google Calendar: token expirado pode não refresh em background
**Status:** EDGE CASE POTENCIAL  
**Afeta:** `/api/calendar/sync` + sincronização automática de consultas  
**Descrição:** O `google-calendar.service.ts` faz refresh do token 60s antes do vencimento. Se o servidor reiniciar exatamente nesse intervalo, o refresh pode falhar silenciosamente.  
**Impacto:** Sincronização falha até o próximo request bem-sucedido (auto-recupera).  
**Ação:** Fire-and-forget já implementado — impacto é baixo. Monitorar em produção.

---

## 📋 PRÓXIMAS SPRINTS SUGERIDAS (para CODEX/ANTIGRAVITY)

> Ordenadas por valor clínico para o TCC. Consultar seção 9 do collab antes de iniciar.

### Alta prioridade (TCC polish)

| # | Sprint | Descrição | Status |
|---|---|---|---|
| 1 | **Sprint AAHB** | Teste unitário `getBirthdaysThisWeek` + `getPatientsWithoutRecentCheckin` | ✅ DONE |
| 2 | **Sprint AAHC** | Notificação push PWA básica (requer VAPID keys do usuário) | ⛔ BLOQUEADO |
| 3 | **Sprint AAHD** | Relatório de evolução com comparativo gráfico inicial vs atual | ✅ DONE (`/relatorio`) |
| 4 | **Sprint AAHE** | Mapa de calor de refeições por horário no diário alimentar | ✅ DONE (`/diario` heatmap) |
| 5 | **Sprint AAHF** | Exportar PDF da ficha clínica | ✅ DONE (`/ficha` + PrintButton) |

### Médio prazo

| # | Sprint | Descrição | Status |
|---|---|---|---|
| 6 | **Sprint AAHG** | Gráfico de evolução do IMC ao longo do tempo | ✅ DONE (BMISparklineCard) |
| 7 | **Sprint AAHH** | Tag system: filtrar pacientes por tag | ✅ DONE (TagManager + filter param) |
| 8 | **Sprint AAHI** | Modal de consulta rápida direto do card da agenda | ✅ DONE (AppointmentEditModal) |
| 9 | **Sprint AAHJ** | Histórico de ativações de planos no prontuário | ✅ DONE (2026-06-27 CLAUDE_CODE) |
| 10 | **Sprint AAHK** | Relatório imprimível A4 completo (anamnese + medidas + plano + metas) | ✅ DONE (2026-06-27 CLAUDE_CODE) |

### Ideias futuras (pós-TCC)

- **Agendamento pelo paciente**: Portal com formulário de solicitação de horário → nutricionista aprova
- **Plano alimentar interativo**: Paciente marca refeições como "feitas" no portal
- **IA sugestão de receitas**: Baseado nas preferências da anamnese + restrições dietéticas
- **Multi-idioma**: i18n básico PT-BR → EN para internacionalização
- **Integração com balança smart**: Webhook ou import de CSV de peso automático
- **Videoconsulta gravada**: Storage da gravação Jitsi no VercelBlob
- **Painel de faturamento básico**: Registrar pagamentos de consultas (não é financeiro completo)

---

## 🤝 PROTOCOLO DE USO DESTE ARQUIVO

**Ao adicionar um bug:**
1. Verifique se não é algo que uma IA pode corrigir agora
2. Teste o comportamento no ambiente local antes de documentar
3. Adicione no formato: `### BUG-XXX — Título` com Status/Afeta/Descrição/Ação necessária

**Ao resolver um bug:**
1. Marque o Status como `RESOLVIDO` com data e qual agente resolveu
2. Mova para seção `## ✅ RESOLVIDOS` (ao final deste arquivo)
3. Reporte no `collab-IAS-REPORT.md`

---

## ✅ RESOLVIDOS

### BUG-003 — iCal `startTime` robustez
**Resolvido por:** CLAUDE_CODE | **Data:** 2026-06-27  
**Fix:** regex + isNaN guards em `api/calendar/sync/route.ts`

### BUG-007 — Vitest avisa sobre `vite-tsconfig-paths`
**Resolvido por:** CODEX | **Data:** 2026-06-27  
**Fix:** `vitest.config.ts` → `resolve.tsconfigPaths: true`; plugin `vite-tsconfig-paths` removido.

### BUG-000 — Supabase hibernado bloqueando `prisma db push`
**Resolvido por:** Usuário (reativou o projeto no painel Supabase)  
**Data:** 2026-06-27  
**Detalhes:** Projeto `vxxnaktpdaehcvyxkohy` hibernou por inatividade. ANTIGRAVITY aguardou por ~3h. Após reativação, `db push` foi executado com sucesso e `calendarToken` + `gender` foram aplicados.
