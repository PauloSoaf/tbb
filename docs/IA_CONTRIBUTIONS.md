# NutriOpus — Contribuições das IAs (Documentação Completa)

**Data de fechamento desta sessão:** 2026-06-27  
**Build final:** ✓ Compiled | lint: PASSOU | tsc --noEmit: 0 erros | Vitest: 124/124 (2026-06-27 17:30)  
**Branch:** dev  

---

## Visão Geral do Sistema Multi-IA

O NutriOpus foi desenvolvido em colaboração por três agentes de IA com papéis distintos:

| Agente | Papel | Área Principal |
|---|---|---|
| **CLAUDE_CODE** | Tech Lead | Arquitetura, segurança, features core, polish TCC |
| **CODEX** | Backend Assistant | Schema inicial, bugfixes pontuais |
| **ANTIGRAVITY** | Integrações Externas | WhatsApp, PWA, Resend Email, Jitsi, iCal |

---

## CLAUDE_CODE — Contribuições Detalhadas

### Sprint D — Storage Abstraction
- `StorageProvider` interface unificada
- `LocalStorageProvider` (desenvolvimento local)
- `VercelBlobProvider` (produção)
- Variável de ambiente `STORAGE_PROVIDER=local|vercel-blob`

### Sprint E — Prontuário 360
- Modelo `PatientNote`, `PatientTag`, `PatientTask` no schema Prisma
- `ProntuarioPanel` com abas (Notas, Tags, Tarefas)
- Sistema de timeline do paciente (consultas, anamneses, medidas, planos, notas, documentos, videoconsultas)
- `QuickNoteInput` para nota rápida direto do prontuário

### Sprint F — Adipômetro (Dobras Cutâneas)
- 7 protocolos de avaliação: Pollock 3 e 7 dobras, Guedes, Petroski, Durnin-Womersley
- `SkinfoldForm` com seleção de protocolo e sexo
- `SkinfoldHistory` com histórico de medições
- Cálculo de % gordura e massa magra

### Sprint G — Estúdio de Planos 2.0
- PDF de plano alimentar com imagens (PrintButton, layout responsivo)
- Preview do cardápio para o paciente em `/portal/[tenant]/cardapio/[planId]`
- Integração com MealPlanStudio (drag & drop, SmartPaste, TACO search)

### Sprint H — Metas e Lembretes
- Modelos `PatientGoal`, `GoalCheckIn`, `PatientReminder`
- `GoalsPanel` com abas Metas / Lembretes integrado ao prontuário

### Sprint I — Relatórios
- `EvolutionReport` com recharts (LineChart peso + gordura)
- Página `/relatorio` do paciente no dashboard
- `MetasClient` no portal do paciente
- `AdherenceChart` para adesão calórica

### Sprint J — RBAC e Equipe
- Modelos `TeamMember`, `TeamInvite`
- `TeamPanel`, `InviteAssistantForm`, `AcceptInviteClient`
- Fluxo: convite por email → link de aceite → membro da equipe

### Sprint K — Diário Alimentar
- `FoodDiaryEntry` (modelo CODEX integrado)
- Serviço + actions de CRUD para diário alimentar
- `DiaryClient` com formulário de registro por refeição

### Sprint L — Equipe UI
- Página `/equipe` no dashboard
- `TeamPanel` com listagem de membros e convites pendentes
- Fix em `config/page.tsx` (campo `specialties` incorreto)

### Sprint M — Evolução Dobras
- `SkinfoldEvolutionChart` (recharts, múltiplas dobras ao longo do tempo)
- Integrado à página de adipômetro

### Sprint N — Adesão Calórica + Export CSV
- `AdherenceChart` (gráfico de adesão diária ao plano calórico)
- `adherence.service.ts`
- `/api/export/csv` com 4 tipos de exportação (pacientes, anamneses, medidas, diário)
- `ExportButtons` integrado às páginas de análise

### Sprint O — Portal Peso + Evolução
- Portal peso: `WeightHistoryChart` + histórico de registros
- Portal evolução: `EvolucaoChart` (peso + % gordura ao longo do tempo)

### Sprint P — GoalsPanel Integrado
- `GoalsPanel` substituiu `GoalListPanel` (com aba Lembretes)
- Integrado na sidebar do prontuário do paciente

### Sprint Q — Relatório Clínico
- `clinic-report.service.ts` (KPIs: total pacientes, atendimentos, médias, metas)
- Página `/ferramentas/relatorio-clinica`
- Card adicionado em `/ferramentas`

### Sprint R — Análise IA do Paciente
- `/api/ai/analyze-patient` — integração Groq/LLaMa para análise de progresso
- `AIPatientAnalysis.tsx` com botão "Gerar análise"
- Integrado na página `/relatorio` do paciente

### Sprint S — Adipômetro + JitsiVideoRoom Fix
- Botão direto para Adipômetro na página de medidas
- Fix `JitsiVideoRoom`: email undefined + spinner JSX inválido → função componente

### Sprint U — Google Agenda OAuth2
- `google-calendar.service.ts` com token manager, refresh automático, createEvent
- `/api/auth/google` e `/api/auth/google/callback` (fluxo OAuth completo)
- `google-calendar.action.ts` — disconnect, status check, syncAppointmentToCalendar
- `GoogleCalendarConnect.tsx` na página de configurações
- Schema Prisma: 4 campos `google*` em `Nutritionist`

### Sprint V — Mobile Navigation
- `MobileBottomNav` corrigido (5 itens corretos)
- `PortalNav` mobile: drawer "Mais" para links secundários
- `PatientStickyHeader` responsivo (texto truncado, botões ícone-only em mobile)
- `globals.css`: `pb-safe` iOS + `overflow-x: hidden`

### Sprint W — Filtro de Pacientes
- Filtro de status por query string (Todos/Ativos/Inativos/Arquivados)
- `patient.service.ts`: `listPatients` com parâmetro `status` opcional
- Botões de filtro sem JS client-side (form GET nativo)

### Sprint X — Auto-Sync Google Calendar
- `createAppointmentAction`: sincroniza Google Calendar ao criar consulta (fire-and-forget)
- Não bloqueia se calendar não estiver conectado

### Sprint Y — Feedback OAuth Google
- `GoogleCalendarFeedback.tsx`: toast de sucesso/erro após callback
- `config/page.tsx`: searchParams `googleConnected` / `googleError`

### Sprint Z — Auditoria Final
- Verificação de todas as páginas do portal
- Confirmação de coexistência iCal + OAuth sem conflito
- Build limpo 0 erros

### Sprint AA — Emails Transacionais
- `AppointmentConfirmTemplate.ts`: HTML premium de confirmação de consulta
- `WelcomePatientTemplate.ts`: boas-vindas para novo paciente
- `email.service.ts`: `sendAppointmentConfirmEmail` + `sendWelcomePatientEmail`
- Fire-and-forget em `appointment.action.ts` e `createPatient.action.ts`

### Sprint AB — Delete de Consultas
- `deleteAppointmentAction` com guard de tenant
- `AppointmentStatusButtons.tsx`: botão lixeira com double-click-confirm
- Disponível para todos os status na agenda

### Sprint AC — Onboarding Checklist
- Banner no dashboard com checklist de 4 passos (visível quando 0 pacientes)
- Checks automáticos: perfil preenchido, paciente criado, Google Calendar conectado
- Card "Oficina de Planos" adicionado em `/ferramentas`

### Sprint AD — Edição de Consultas
- `updateAppointment` service
- `updateAppointmentAction` com guard de tenant
- `AppointmentEditModal.tsx`: modal com form pré-preenchido (lápis → modal → toast)

### Sprint AE — Cadastro de Nutricionista
- `register.action.ts`: cria Nutritionist + User em transação, slug único, sessão imediata
- `app/cadastro/page.tsx`: formulário completo (nome, email, senha, CRN, cidade, estado)
- `PublicHero.tsx`: CTA principal "Criar conta grátis"

### Sprint AF — Landing Page
- Grid de 9 features reais do produto
- CTA section final azul
- Footer com link de privacidade

### Sprint AG — Link de Ativação do Portal
- `createPatient.action.ts`: gera token de ativação 48h automaticamente
- `WelcomePatientTemplate.ts`: botão "Ativar minha conta" com link personalizado

### Sprint AH — Reenvio de Link de Portal
- `resendActivationLinkAction`: novo token 48h + email
- `ResendPortalLinkButton.tsx` integrado na página do paciente

### Sprint AI — Auditoria Final (PDF, Timeline, Modelos)
- PDF de plano alimentar: confirmado funcional
- Timeline: todos os eventos incluídos
- `register.action.ts`: redirect corretamente fora do try/catch

### Sprint AJ — Notificação de Nova Anamnese por Email
- `NewAnamneseTemplate.ts`: HTML de notificação para o nutricionista
- `submitAnamnese.action.ts`: fire-and-forget ao receber pré-consulta
- `pre-consulta/sucesso/page.tsx`: CTA "Acessar meu portal" + info sobre ativação

### Sprint AL — Chat Nutricionista
- `getNutritionistChatAction`: busca mensagens do chat por paciente
- `NutritionistChatView.tsx`: histórico + envio no lado do nutricionista
- Página `/pacientes/[patientId]/chat`

### Sprint AM — Botão Copiar Link de Pré-Consulta
- `CopyPreConsultaLink.tsx`: clipboard API + feedback visual
- Integrado no dashboard (estado vazio + painel de atalhos)

### Sprint AN — Auditoria Geral Completa
- Portal: 9+ cards de navegação
- Dashboard: stats, anamneses, consultas, atalhos — completo
- Configurações: specialties, WhatsApp, Google Calendar, upload de foto

### Sprint AO/AP/AQ — SEO e Error Handling Global
- `app/not-found.tsx`: 404 global customizado
- `app/error.tsx`: error boundary global
- `app/layout.tsx`: Open Graph metadata, title template, keywords

### Sprint AW — Banco de Alimentos TACO
- `src/data/taco.json`: expandido de 10 → 100 alimentos brasileiros (carnes, peixes, ovos, laticínios, frutas, legumes, grãos, oleaginosas, suplementos)

### Sprint AY/AZ — Auditorias de Segurança
- Confirmado: `passwordHash` nunca exposto em select queries
- Confirmado: `activationToken` nunca retornado ao cliente
- Multi-tenant: `assertTenantAccess` + `assertPatientAccess` em todos os pontos de entrada

### Sprint AAA — Guards nas APIs de IA
- `/api/upload`: guard de sessão adicionado
- `/api/ai/generate-meal-plan`: guard de sessão adicionado
- `/api/ai/summarize-anamnesis`: guard de sessão adicionado

### Sprint AAB-AAE — Templates e Testes
- `meal-plan-templates.ts`: 3 → 5 templates (+ Manutenção Saudável + Controle Glicêmico)
- Vitest: 115/115 testes passando (validações Zod completas)

### Sprint AAJ-AAL — Auditorias de Componentes
- EvolucaoChart (recharts): peso + gordura — confirmado completo
- Cardápio portal: macros calculados por `calculateMealTotals`
- MealPlanClientView: ativar/desativar, deletar refeições/itens, salvar totais

### Sprint AAM — Diário Alimentar no Dashboard do Nutri
- `/pacientes/[patientId]/diario/page.tsx`: filtro 7/14/30 dias, agrupamento por dia, totais de macros

### Sprint AAP — Listagem de Anamneses por Paciente
- `/pacientes/[patientId]/anamnese/page.tsx`: lista completa com status, resumo IA, pontos de atenção

### Sprint AAR — Segurança relatorio/page.tsx
- Migrado de `getSessionFromCookies()` manual → `assertTenantAccess(tenant)`

### Sprint AABC-AABE — Migração Auth Padrão
- 9 páginas migradas para `assertTenantAccess` (medidas, anamnese/nova, ferramentas, arquivos)
- Dashboard 100% padronizado: zero páginas com padrão antigo

### Sprint AABB — Links Rápidos Página do Paciente
- 6 → 8 links rápidos: Evolução, Adesão, Anamneses, Diário, Chat, Agendar, Planos, Medidas

### Sprint AABP — Agenda com PatientId Pré-selecionado
- `agenda/page.tsx`: suporte a `?patientId=` em searchParams
- `AppointmentForm.tsx`: `defaultPatientId` + `useSearchParams`

### Sprint AABV-AACC — Metadata das Páginas do Portal
- 13 páginas do portal com `Metadata` correto
- 3 `loading.tsx` (cardápio, evolução, diário)

### Sprint AACG-AACI — Archive Patient + Calculadora TMB
- `ArchivePatientButton` integrado na zona de perigo de edição do paciente
- Calculadora TMB+VET Mifflin-St Jeor com 5 níveis de atividade e 3 metas calóricas

### Sprint AACN-AACV — Sticky Header + Botão Editar
- `PatientStickyHeader.tsx`: botão "Editar" (ícone Pencil) adicionado

### Sprint AADD-AADG — Metadata Público
- `generateMetadata` dinâmico em `/[tenant]` e `/[tenant]/pre-consulta`
- `login/layout.tsx` e `cadastro/layout.tsx`: metadata para rotas client-only

### Sprint AADJ-AADL — Chat com Polling Automático
- `ChatClient.tsx` (portal): polling 15s via `setInterval` + cleanup `useEffect`
- `NutritionistChatView.tsx` (dashboard): polling 15s idem

### Sprint AADM — Badge de Não-Lidos no Portal
- `portal/[tenant]/page.tsx`: badge vermelho capped "9+" no card Chat
- Query Prisma: `chatMessage.count` onde `sender=NUTRITIONIST, readAt=null`

### Sprint AADU-AADV — Conformidade LGPD
- `/privacidade/page.tsx`: 8 seções LGPD (dados coletados, finalidade, base legal, segurança, direitos, retenção, compartilhamento)
- Footer da landing + pré-consulta com link de privacidade
- Link "Já sou paciente →" no header da pré-consulta

### Sprint AADW-AADZ — UX Portal + Delete Diário
- Portal home: 11 cards (+ Consultas + Videoconsultas)
- Saudações gender-neutral ("Olá" / "Bem-vindo(a)")
- `deleteFoodDiaryEntry`: service + action + botão Trash2 no DiaryClient

### Sprint AAEB-AAEE — Resiliência Portal
- `portal/[tenant]/not-found.tsx`: 404 contextualizado
- `portal/[tenant]/error.tsx`: error boundary client

### Sprint AAEI-AAEK — Sidebar Equipe + Unread Chat Dashboard
- `DashboardSidebar.tsx`: link "Equipe" (ícone `UserCog`) adicionado
- `dashboard.service.ts`: `unreadChatMessages` no `getDashboardStats`
- Banner de mensagens não-lidas no dashboard

### Sprint AAEL — StatsCards Linkados
- `StatsCard.tsx`: prop `href?` — envolve em `<Link>` quando fornecido
- 5 cards com href (Pacientes, Anamneses, Consultas, Pontos, Msgs)
- 6º card "Msgs não lidas" com `MessageCircle`

### Sprints AAEV-AAFG (sessão anterior, compactada)
- **AAEV**: "Semana em Destaque" no portal home (streak, humor médio, metas alcançadas, barra 7 dias)
- **AAEW**: Badge de engajamento no prontuário (barra 7 dias + Alta/Média/Baixa por check-ins)
- **AAEX**: Filtro de engajamento na lista de pacientes (COM/SEM check-in nos últimos 7 dias)
- **AAEY**: Modal de notas clínicas ao marcar consulta como DONE
- **AAEZ**: Cards de progresso na evolução do portal (variação peso/gordura + total avaliações)
- **AAFA**: Página pública enriquecida (prova social "X pacientes" + botão "Já sou paciente")
- **AAFB**: Histórico de consultas por paciente (`/pacientes/[patientId]/consultas`)
- **AAFC**: Coluna "Última Consulta" na PatientTable
- **AAFD**: Gráfico BarChart de consultas por mês no Relatório da Clínica + fix calendar.action.ts import
- **AAFE**: Marcar mensagens como lidas quando nutricionista abre o chat
- **AAFF**: Ordenação na lista de pacientes (Mais recentes / Nome A-Z / Mais antigos)
- **AAFG**: docs/IA_CONTRIBUTIONS.md atualizado

### Sprint AAFH — Comparativo Inicial vs Atual no Prontuário
- `patient-measurement.service.ts`: `getFirstPatientMeasurement` (ordenado ASC)
- `pacientes/[patientId]/page.tsx`: busca firstMeasurement em paralelo
- Sidebar: card "Comparativo Inicial → Atual" com diferença de peso e % gordura
  - Ícones TrendingDown/Up/Minus com cores emerald/rose/gray

### Sprint AAFI — Portal Agenda: Histórico de Consultas
- `patient-portal.service.ts`: removido filtro `date >= now` → busca últimas 20 consultas
- `portal/[tenant]/agenda/page.tsx`: separado em "Próximas" (SCHEDULED futuras) + "Histórico"
  - Ícones Check/X nos badges de status, seções condicionais

### Sprint AAFJ — Link do Portal via WhatsApp no Prontuário
- Botão "Enviar link do portal via WhatsApp" na sidebar de Informações de Contato
- Link `wa.me/55{telefone}?text=...` pré-preenchido com nome do paciente e URL do portal
- Usa `NEXT_PUBLIC_APP_URL` para gerar URL correta

### Sprint AAFK — Check-ins na Tabela de Engajamento do Relatório
- `clinic-report.service.ts`: `checkinLast7Days` adicionado via `wellnessCheckin.groupBy`
- `ferramentas/relatorio-clinica/page.tsx`: nova coluna "Check-ins (7d)" com cores Verde/Âmbar/Vermelho

### Sprint AAFM — Página de Login do Portal com Foto da Nutricionista
- `portal/[tenant]/login/page.tsx`: foto circular da nutricionista + nome + CRN
  - Fallback: inicial do nome em círculo brand-blue

### Sprint AAFN — Tela de Ativação de Acesso Melhorada
- `portal/[tenant]/ativar-acesso/page.tsx`: foto da nutricionista + saudação "Bem-vinda!"
  - Banner verde de confirmação mostrando o email antes do formulário
  - Estados de erro consolidados em função helper `errorCard`

### Sprint AAFO — Lembrete de Consulta no Check-in + Bugfix Portal Home
- **BugFix**: `portal/[tenant]/page.tsx` — `nextAppointment` reescrito para filtrar corretamente após mudança de ordenação no `getPortalPatient`; agora ordena ASC antes do `find()`
- `portal/[tenant]/checkin/page.tsx`: banner "Sua consulta é em X dias" (visível apenas quando ≤7 dias)
  - "Sua consulta é hoje!" / "amanhã!" / "em X dias"
  - Ícone CalendarClock, fundo brand-blue/5

### Sprint AAFP — Status de Acesso ao Portal + Dias de Acompanhamento
- `pacientes/[patientId]/page.tsx`: query paralela `patientAccount` (status, activatedAt, lastLoginAt)
- Novo card na sidebar: "Em acompanhamento: X dias" + badge de status portal (Ativo/Pendente/Sem acesso)
- Mostra "Último acesso: dd/MM/yyyy" quando ativo com lastLoginAt
- Ícones ShieldCheck/ShieldOff

### Sprint AAFR — Próxima Consulta no Sidebar do Prontuário
- `pacientes/[patientId]/page.tsx`: query `appointment.findFirst` (SCHEDULED, data futura, asc)
- Card "Próxima Consulta" azul acima de Informações de Contato, com data/horário/modalidade
- Visível apenas quando há consulta agendada

### Sprint AAFS — Bem-estar no Relatório de Evolução
- `relatorio/page.tsx`: busca `wellnessCheckin` (últimos 7 dias) em paralelo
- Card "Bem-estar (últimos 7 dias)" no topo com 3 colunas: Humor (emoji), Energia (emoji), Sono (horas)
- Visível apenas quando há check-ins no período

### Sprint AAFU — KPIs na Agenda
- `agenda/page.tsx`: barra de 4 KPIs (Total, Agendadas, Realizadas, Canceladas) acima da lista
- Visível apenas quando há consultas no período; cores distintas por status

### Sprint AAFW — Consultas Realizadas no Sidebar
- `pacientes/[patientId]/page.tsx`: `appointment.count(DONE)` em paralelo
- Card de status: campo "Consultas realizadas: N" (visível quando > 0)

### Sprint AAFY — Fix Lint + Build Final
- `Date.now()` impuro em JSX detectado pelo ESLint (react-hooks/purity)
- Fix: movido para `daysOnTrackComputed` computado antes do return, fora do JSX
- `npm run lint --quiet`: PASSOU

### Sprint AAGA — Filtro "Com Plano Ativo" na Lista de Pacientes
- `patient.service.ts`: `listPatients` suporta `engagement === "WITH_PLAN"`
  - Filtro: `mealPlans: { some: { status: "ACTIVE", isTemplate: false } }`
- `pacientes/page.tsx`: nova opção "Com plano ativo" nos filtros de engajamento

### Sprint AAGC — Planos Ativos nos KPIs do Relatório da Clínica
- `clinic-report.service.ts`: campo `activeMealPlans` em `getClinicOverview`
- `relatorio-clinica/page.tsx`: KPI grid 6→7 colunas, "Planos ativos" (ícone Utensils)

### Sprint AAGE — Check-ins de Hoje no Dashboard
- `dashboard.service.ts`: `getTodayCheckins` — consulta wellnessCheckin do dia atual
- `dashboard/[tenant]/page.tsx`: banner verde "N paciente(s) fizeram check-in hoje"
  - Emoji de humor por paciente + link para prontuário; visível apenas quando há check-ins

### Sprint AAGF — Build + Vitest
- `npm run build`: ✓ Compiled in 6.9s
- `npx vitest run`: 115/115 ✓ (13 arquivos)

### Sprint AAGI — StatsCard "Sem check-in (7d)" no Dashboard
- `dashboard.service.ts`: `getPatientsWithoutRecentCheckin` — count de ativos sem check-in nos últimos 7 dias
- `dashboard/[tenant]/page.tsx`: 7º StatsCard grid 6→7 colunas
  - Amber quando > 0, verde quando todos ativos; link para lista filtrada `?engagement=WITHOUT_CHECKIN`

### Sprint AAGJ — Build Final
- `npm run lint --quiet`: PASSOU (0 erros)
- `npm run build`: ✓ Compiled 7.5s
- `npx tsc --noEmit`: 0 erros

### Sprint AAGL — Aniversários desta Semana no Dashboard
- `dashboard.service.ts`: `getBirthdaysThisWeek` — filtra pacientes ativos com birthDate na semana corrente
  - Cálculo de daysUntil e ordenação crescente
- `dashboard/[tenant]/page.tsx`: banner rosa com Cake icon, chips com link para prontuário
  - Labels "hoje! / amanhã / em Xd" para cada aniversariante

### Sprint AAGM — Build Final
- `npm run build`: ✓ Compiled 7.1s

### Sprint AAGO — "Daqui X dias" na Próxima Consulta do Portal
- `portal/[tenant]/page.tsx`: card de próxima consulta enriquecido com `daysUntil`
  - "Hoje!" (emerald), "Amanhã" (amber), "Em Xd" (cinza) — coloração contextual

### Sprint AAGQ — Ficha Clínica Resumo Imprimível
- `pacientes/[patientId]/ficha/page.tsx` (NOVO): layout A4 clean para impressão
  - Dados do paciente: nome, nascimento+idade, contato, objetivo
  - Última avaliação: peso, altura, IMC, % gordura, cintura, quadril
  - Metas ativas com progresso (até 5)
  - Área de assinatura nutricionista + paciente + PrintButton
- `pacientes/[patientId]/page.tsx`: link "Ficha clínica resumo" no sidebar (ícone Printer)

### Sprint AAGS — Build + Vitest Final
- `npm run build`: ✓ Compiled 6.9s
- `npx vitest run`: 115/115 ✓ (13 arquivos)

### Sprint AAGU — Build + Vitest + Lint Final da Sessão
- `npm run lint --quiet`: PASSOU (0 erros)
- `npx vitest run`: 115/115 ✓ (13 arquivos)
- `npm run build`: ✓ Compiled 6.6s
- `npx tsc --noEmit`: 0 erros

### Sprint AAGW — Exportação CSV de Bem-estar
- `api/export/csv/route.ts`: novo type `wellness` — exporta WellnessCheckin (data, humor, energia, sono, notas)
- `ExportButtons.tsx`: 4 → 5 botões (+ "Bem-estar")

### Sprint AAGX — Encerramento de Sessão (Temporário)
- Build final: ✓ Compiled 6.7s | tsc: 0 erros | Vitest: 115/115

### Sprint AAHA — Campo `gender` no Modelo Patient (end-to-end)
- `prisma/schema.prisma`: campo `gender String?` adicionado ao model Patient
- `prisma/migrations/20260627150000_add_patient_gender/migration.sql`: `ALTER TABLE "Patient" ADD COLUMN "gender" TEXT`
- `src/validation/patient.schema.ts`: `gender: z.enum(["F","M","O"]).optional()`
- `src/components/patients/PatientForm.tsx`: select "Sexo" (Feminino/Masculino/Outro/Não informado)
- `src/actions/createPatient.action.ts` e `updatePatient.action.ts`: passam `gender` ao service
- `src/services/patient.service.ts`: `createPatient`/`updatePatient` aceitam e persistem `gender`

### Sprint AAHB — Exibição do `gender` em Prontuário e Ficha Clínica
- `page.tsx` (prontuário): campo "Sexo" já exibido via `genderLabel()` na aba de informações
- `ficha/page.tsx`: campo `gender` incluído na query e exibido como "Sexo" na ficha impressa
- `ficha/page.tsx` e `page.tsx`: função `genderLabel()` (F→Feminino, M→Masculino, O→Outro)

### Sprint AAHC — Testes Vitest para `gender` e Dashboard
- `src/validation/__tests__/patient.schema.test.ts`: testes para gender válido/inválido já presentes
- `src/services/__tests__/dashboard.service.test.ts`: testes para `getBirthdaysThisWeek` e `getPatientsWithoutRecentCheckin`
- `npx vitest run`: 118/118 ✓ (14 arquivos — CODEX adicionou 3 testes ao corrigir BUG-007)

### Sprint AAHD — Links Adipometro e Arquivos no Sidebar do Prontuário
- `page.tsx` (prontuário): adicionados links "Adipometro (dobras cutâneas)" e "Arquivos e documentos"
- Importados ícones `Activity` e `Paperclip` do lucide-react

### Sprint AAHK — Fix JitsiVideoRoom + Sistema de Tags (Filtro)
- `JitsiVideoRoom.tsx`: substituído @jitsi/react-sdk pelo Jitsi External API (script dinâmico); removido spinner React que bloqueava dialogs de câmera/microfone
- `patient.service.ts`: `listDistinctPatientTags` + param `tag` em `listPatients` + `include: { patientTags }`
- `pacientes/page.tsx`: filtro de tags com chips coloridos (ativo/inativo) acima da lista de pacientes

### Sprint AAHL — TagManager no Prontuário (CRUD de Tags)
- `patient-tag.action.ts` (NOVO): `createPatientTagAction` + `deletePatientTagAction` com guards multi-tenant
- `TagManager.tsx` (NOVO): seletor de 10 cores, input Enter/Escape, chips com X, `useTransition` para feedback
- `PatientTable.tsx`: chips de tag coloridos exibidos sob o nome de cada paciente
- `PatientMobileCard.tsx`: chips de tag entre IMC e botões de ação
- `pacientes/[patientId]/page.tsx`: query `patientTags` em `Promise.all`, `<TagManager>` no sidebar

### Sprint AAMN — Notas em Consultas Realizadas + Botão Sala Online
- `AppointmentStatusButtons.tsx`: botão FileText para DONE/CANCELED abre modal de edição de notas (`updateAppointmentNotesAction` sem mudar status)
- `appointment.service.ts`: `listAppointments` inclui `careSessions` (take:1, select id+status)
- `agenda/page.tsx`: botão "Sala" violeta em consultas ONLINE+SCHEDULED → link direto para care session ou lista de atendimentos

### Sprint Floating Assistant — IA Assistente e Ferramentas Flutuantes
Trabalho conjunto CLAUDE_CODE + ANTIGRAVITY + CODEX:
- **Dock de 2 botões** em `FloatingActionDock.tsx` injetado no `dashboard/[tenant]/layout.tsx`
- **AI Drawer** (`AIAssistantDrawer`, `AIAssistantChat`, `AIAssistantComposer`, `AIAssistantMessageBubble`, `AIAssistantSuggestedPrompts`, `AIAssistantContextBar`)
- **Tools Drawer** (`FloatingToolsDrawer`, `FloatingToolCard`, `FloatingToolsSearch`, `FloatingToolsLauncher`, `FloatingToolsWindow`)
- **Mini Janelas Arrastáveis** (`DraggableFloatingWindow`, `MiniTacoSearchTool`, `MiniBMICalculatorTool`, `MiniMacroCalculatorTool`, `MiniCalculatorTool`, `useDraggable` hook)
- **Camada de IA**: `ai-provider.ts` (interface), `llama-provider.ts` (Groq/Ollama/OpenRouter), `ai-system-prompt.ts`, `nutriopus-knowledge.ts` (knowledge base + `getKnowledgeForPrompt`), `ai-actions.ts` (`inferSafeActions` + `validateAssistantActions`)
- **Server**: `ai-assistant.service.ts`, `ai-assistant.action.ts`, `ai-patient-context.service.ts`, `validation/ai-assistant.schema.ts`
- **Segurança**: rotas só dentro do tenant, nunca href arbitrário da IA, prompt sanitizado, contexto mínimo enviado ao provider
- **Testes**: `ai-actions.test.ts` (inferSafeActions + validateAssistantActions), `ai-assistant.schema.test.ts` (schema + sanitização), `FloatingToolsLauncher.test.ts` (tools list)
- **Docs**: `docs/FLOATING_ASSISTANT_AND_TOOLS.md` completo

### Sprint AANO — OPEN_TOOL: Botões de Ferramentas no Chat IA
- `AIAssistantMessageBubble.tsx`: renderização separada de `toolActions` (botões emerald/verde com ícone Wrench) e `navActions` (Links azul-brand)
  - `onOpenTool?: (toolId: string) => void` prop adicionada
- `AIAssistantChat.tsx`: prop `onOpenTool` propagada até MessageBubble
- `AIAssistantDrawer.tsx`, `FloatingActionDock.tsx`: cadeia completa de `onOpenTool`
- `FloatingActionDock.tsx`: `valid: FloatingToolId[]` — valida toolId antes de abrir janela

### Sprint AAOB — IA Ciente das Ferramentas Flutuantes
- `ai-actions.ts`: `FLOATING_TOOL_KEYWORDS` — 4 entradas mapeando toolId → keywords para inferência de OPEN_TOOL; `inferSafeActions` gera OPEN_TOOL; `.slice(0,4)` (era 3) para não truncar OPEN_TOOL
- `ai-system-prompt.ts`: seção de ferramentas flutuantes com descrições de TACO, IMC, Macros, Água
- `nutriopus-knowledge.ts`: `FLOATING_TOOLS_KNOWLEDGE` array + `getKnowledgeForPrompt` retorna `{ modulos, ferramentasFlutuantes }` (era array flat)
- `ai-actions.test.ts`: teste "infers OPEN_TOOL actions for floating tools" (bmi, macros, water)

### Sprint AAPC — Nome do Paciente no Context Bar
- `patient-name.action.ts` (NOVO): server action `getPatientNameAction(patientId)` com guard `nutritionistId`
- `AIAssistantContextBar.tsx`: `useEffect` com flag `cancelled` busca nome real do paciente; mostra "…" durante carregamento; "Clínica" em vez de "Tenant"

### Sprint AAPD — Auto-scroll no Chat IA
- `AIAssistantChat.tsx`: `bottomRef + useEffect([messages, isPending])` — scroll suave ao final a cada nova mensagem ou durante typing indicator

### Sprint AAPE — Fix SSR Hydration em DraggableFloatingWindow
- `DraggableFloatingWindow.tsx`: `useState({ x:24, y:96 })` (sem ler localStorage no initializer); leitura do localStorage em `useEffect` via `Promise.resolve().then()` — evita mismatch de hidratação SSR/cliente

### Sprint AAPF — Contador de Caracteres no Composer
- `AIAssistantComposer.tsx`: contador "NNN/1200" aparece quando `value.length > 900`; amber quando >900, vermelho quando ≥1150

### Sprint AAPG — Persistência de Histórico + Botão Limpar
- `AIAssistantChat.tsx`: chave `nutriopus-ai-chat-${tenant}` no localStorage; carregamento no mount via `Promise.resolve().then()` com `loadDoneRef` (evita salvar WELCOME_MESSAGE antes de carregar histórico real); máximo 20 mensagens; botão Trash2 (visível quando há >1 mensagem) limpa histórico

### Sprint AAPG-B — 5ª Mini Ferramenta Flutuante: TMB/GET
- `MiniTMBCalculatorTool.tsx` (NOVO): Mifflin-St Jeor; toggle Feminino/Masculino; campos Peso/Altura/Idade; select 5 níveis de atividade; exibe TMB (cinza) e GET (azul) side-by-side em tempo real; aviso de revisão clínica
- `types.ts`: `FloatingToolId` += `"tmb"`
- `FloatingToolsWindow.tsx`: `TOOL_TITLES["tmb"]` + `ToolContent` case tmb
- `FloatingToolsLauncher.tsx`: entrada TMB com `floating:"tmb" as const`
- `FloatingActionDock.tsx`: `valid` array inclui `"tmb"`
- `ai-actions.ts`: FLOATING_TOOL_KEYWORDS entrada tmb (keywords: tmb, get, metabolismo, taxa metabolica, gasto energetico, mifflin)
- `ai-system-prompt.ts`: TMB e GET na lista de ferramentas
- `nutriopus-knowledge.ts`: FLOATING_TOOLS_KNOWLEDGE entrada tmb
- `AIAssistantSuggestedPrompts.tsx`: "Calcular TMB." adicionado
- `ai-actions.test.ts`: +2 testes (tmb keyword inference + validates OPEN_TOOL/NONE)
- `FloatingToolsLauncher.test.ts`: +2 expects (tmb floating + suite "includes all 5 floating IDs")
- **Bug corrigido**: `loadDoneRef.current` setado dentro do `.then()/.catch()` — evita race condition onde save gravava `[WELCOME_MESSAGE]` sobrescrevendo histórico antes do carregamento completar

---

### Sprint AAQJ — Cobertura de Testes ai-actions + Polimentos IA
- `ai-actions.test.ts`: +4 testes — OPEN_PATIENT inferido com patientId, ausente sem patientId, dedup de NAVIGATE hrefs, path traversal `..` bloqueado
- `ai-system-prompt.ts`: instrução "Voce tem memoria desta conversa" — LLM orientado a usar histórico para perguntas de acompanhamento
- `types.ts`: `AssistantMessage.isError?: boolean` adicionado
- `AIAssistantMessageBubble.tsx`: bolha âmbar + label "⚠ Não foi possível obter resposta" quando `isError`
- `AIAssistantChat.tsx`: marca `isError: !result.ok`; exclui mensagens de erro do histórico enviado ao LLM (evita confundir o modelo com textos de falha técnica)

### Sprint AAQH — Histórico de Conversa no LLM (Memória de Sessão)
- `ai-assistant.schema.ts`: campo `history?: { role: "user"|"assistant"; content: string }[]` (máx 10 itens) — role restrito para impedir injeção de "system"
- `ai-assistant.action.ts`: `history` passado ao service
- `ai-assistant.service.ts`: `ConversationHistoryItem`; `historyMessages` truncados a 800 chars; array enviado ao provider: `[system, context-user, context-ack, ...history, current-user]`
- `AIAssistantChat.tsx`: `messages.slice(-8)` (excluindo WELCOME) enviados como `history` em cada submissão
- `ai-assistant.schema.test.ts`: +3 testes (history válido, role inválido "system", >10 itens)
- **Resultado**: perguntas de acompanhamento como "E a hidratação?" ou "Pode detalhar?" têm contexto da conversa anterior

### Sprint AAQK — Prompts Contextuais + Context Bar Legível
- `AIAssistantSuggestedPrompts.tsx`: prop `patientId` — sem paciente mostra 4 GLOBAL_PROMPTS; com paciente mostra 4 PATIENT_PROMPTS + 4 GLOBAL_PROMPTS; "Resuma este paciente." e calculadoras só aparecem no contexto correto
- `AIAssistantChat.tsx`: passa `patientId` para `AIAssistantSuggestedPrompts`
- `AIAssistantContextBar.tsx`: `getPageLabel()` mapeia 14 padrões de rota para labels PT-BR (Prontuário, Agenda, Ferramentas, Oficina de Planos, Tabela TACO, Calculadoras, etc.); rota crua com UUID removida; nova linha "Página" no context bar

### Sprint AAQM — Módulos Puros + Testes Unitários
- `page-label.ts` (NOVO): `getPageLabel()` extraída do componente para módulo puro, importada em `AIAssistantContextBar`
- `suggested-prompts.ts` (NOVO): `PATIENT_PROMPTS`, `GLOBAL_PROMPTS`, `getSuggestedPrompts(patientId?)` exportados; `AIAssistantSuggestedPrompts` usa `getSuggestedPrompts`
- `__tests__/page-label.test.ts` (NOVO): 10 testes — Dashboard, Prontuário, Planos alimentares, Medidas, Anamneses, Tabela TACO, Oficina de Planos, Ferramentas, Agenda, Configurações
- `__tests__/suggested-prompts.test.ts` (NOVO): 5 testes — sem patientId→GLOBAL, null→GLOBAL, com patientId→PATIENT+GLOBAL, IMC/TMB em PATIENT, agenda/TACO em GLOBAL
- **19 arquivos de teste | 149/149 ✓**

### Sprint AANP — Classificação IMC Completa + Melhoria Visual das Mini-Ferramentas
- `bmi-classification.ts` (NOVO): função pura `classifyBmi(bmi)` com 6 categorias — Baixo peso, Eutrofia, Sobrepeso, Obesidade Grau I, Obesidade Grau II, Obesidade Grau III (antes parava em "Obesidade" genérico)
- `MiniBMICalculatorTool.tsx`: importa `classifyBmi` do módulo; resultado com background colorido contextual (emerald=eutrofia, amber=baixo/sobrepeso, rose=obesidade I/II/III); texto colorido matching
- `MiniCalculatorTool.tsx` (água): resultado exibido em litros `X.X–X.X L` (era apenas ml); fundo sky-50 com texto sky; detalhe ml abaixo; guard `kg <= 0`
- `__tests__/bmi-classification.test.ts` (NOVO): 6 testes cobrindo todos os limites de classificação (17→Baixo peso, 18.5→Eutrofia, 25→Sobrepeso, 30→Grau I, 35→Grau II, 40→Grau III)
- **20 arquivos de teste | 155/155 ✓**

### Sprint AANQ — Calculadora de Macros com Cores + Módulo Puro Testável
- `macro-calculator.ts` (NOVO): `calculateMacros(kcal, proteinPct, carbsPct, fatPct)` → `{ proteinG, carbsG, fatG, total }` — lógica pura extraída (4 kcal/g prot/carb, 9 kcal/g gord)
- `MiniMacroCalculatorTool.tsx`: importa `calculateMacros`; resultados coloridos por macronutriente — proteína=azul (blue-600/blue-50), carbo=âmbar (amber-600/amber-50), gordura=rosa (rose-600/rose-50); guard `kcal <= 0`
- `__tests__/macro-calculator.test.ts` (NOVO): 6 testes — proteína 4 kcal/g, carbo 4 kcal/g, gordura 9 kcal/g, total=100, total≠100, dieta padrão 1800 kcal
- **21 arquivos de teste | 161/161 ✓**

### Sprint AANR — Melhorias Visuais MiniTacoSearchTool
- `MiniTacoSearchTool.tsx`: macros coloridos (P=azul, C=âmbar, G=rosa — consistente com MiniMacroCalculatorTool); label "por 100g" explícito; estado vazio quando busca retorna 0 resultados; limite aumentado 8→10 resultados; padding/gap refinados
- 161/161 ✓ (sem novos testes — componente de UI puro sem lógica extraível)

### Sprint AANS — TMB/GET Módulo Puro + Testes
- `tmb-calculator.ts` (NOVO): `calculateTmb(weightKg, heightCm, ageYears, sex, activityFactor)` → `{ tmb, get }` — Mifflin-St Jeor extraída do componente React para função pura
- `MiniTMBCalculatorTool.tsx`: importa e usa `calculateTmb`; lógica inline removida
- `__tests__/tmb-calculator.test.ts` (NOVO): 5 testes — fórmula masculina (+5), feminina (-161), GET = TMB × fator, sedentário < ativo, valores inteiros
- **22 arquivos de teste | 166/166 ✓**

### Sprint AANR — Melhorias Visuais MiniTacoSearchTool
- `MiniTacoSearchTool.tsx`: macros coloridos (P=azul, C=âmbar, G=rosa); "por 100g" explícito; estado vazio; limite 10

### Sprint AANT — Knowledge Base + System Prompt + Testes Auth/MealPlan
- `nutriopus-knowledge.ts`: +4 módulos (equipe, relatorio-clinica, calculadoras, comparar-pacientes)
- `ai-system-prompt.ts`: seção de módulos; IMC com graus OMS; TMB mencionado
- `__tests__/auth.schema.test.ts` (NOVO): 5 testes loginSchema
- `__tests__/meal-plan.schema.test.ts` (NOVO): 9 testes — refinement TACO/tacoFoodId + validações numéricas
- **24 arquivos de teste | 180/180 ✓**

**Build final desta sessão:** ✓ tsc: 0 erros | Vitest: 180/180 (24 arquivos) | lint: PASSOU | (2026-06-28 00:10)

---

## CODEX — Contribuições Detalhadas

### Schema Inicial
- Modelos `FoodDiaryEntry`, `CalendarEvent` e outros auxiliares no schema Prisma
- Estrutura inicial de actions e services

### Bugs Corrigidos por CLAUDE_CODE (após CODEX)
Os seguintes bugs foram introduzidos pelo CODEX e corrigidos pelo CLAUDE_CODE:

| Bug | Causa CODEX | Fix CLAUDE_CODE |
|---|---|---|
| `CalendarMonthView` type mismatch | Tipagem errada em `agenda/page.tsx` | Corrigido tipos |
| `FoodDatabaseSearch.tsx` | Tipos `{}` e `img src` sem tipagem | Tipagem explícita |
| `MealNodeView.tsx` | `meal.imageUrl` e `meal.items` unknown | Casting correto |
| `patient-timeline.service.ts` | Import inexistente `getNutritionistSession` | Removido import |
| `ProntuarioTimeline.tsx:100` | `event.metadata?.isPinned` unknown | Optional chaining tipado |
| `Document.name` | Campo correto é `fileName` | Renomeado |
| `patient-timeline.action.ts` | Assinatura incorreta de `getPatientTimeline` | Corrigida assinatura |
| `export.action.ts` | Campos inexistentes no schema | Removidos campos inexistentes |
| `GoalListPanel.tsx` | `updatePatientGoalStatusAction` inexistente | Substituído pela action correta |
| `team.action.ts` | bcrypt, prisma.user, duplicatas | Reescrito do zero |
| `team.service.ts` | `prisma.user` + role "ASSISTANT" inválido | Corrigido para schema real |
| `config/page.tsx` | `specialties` inexistente em NutritionistInclude | Adicionado ao include |

---

## ANTIGRAVITY — Contribuições Detalhadas

### WhatsApp via Evolution API
- `whatsapp.service.ts`: envio de mensagens WhatsApp
- Integração com link de WhatsApp na página pública do nutricionista

### PWA (Progressive Web App)
- `manifest.json`: ícones, nome, display standalone
- `sw.js`: service worker básico para instalação

### Resend Email
- `resend.ts`: cliente Resend configurado
- `email.service.ts`: estrutura de envio de emails (base)

### Jitsi Videoconsulta
- `JitsiVideoRoom`: componente de videoconsulta integrado
- Página `/atendimentos/[id]` no portal do paciente

### iCal Export
- Exportação de consultas em formato `.ics`
- Coexiste com Google Calendar OAuth sem conflito

### Cron de Lembretes
- `/api/cron/process-reminders`: endpoint protegido com `CRON_SECRET`
- Integrado ao sistema de `PatientReminder`

### Variáveis de Ambiente
- `.env.example` atualizado com: `GROQ_API_KEY`, `RESEND_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## Estado Final do Projeto

### Build
```
npm run build → ✓ Compiled
npx tsc --noEmit → 0 erros
npx vitest run → 127/127 ✓ (17 arquivos)
npm run lint → PASSOU (0 erros)
```

### Cobertura de Features

**Portal do Paciente (13 cards)**
- Cardápio ativo com macros por refeição
- Evolução (gráfico peso + gordura + cards de progresso)
- Diário Alimentar (criar + excluir)
- Calculadora TACO
- Metas e Lembretes (toggle ACTIVE/ACHIEVED)
- Chat com nutricionista (polling 15s, badge não-lidos)
- Arquivos (documentos compartilhados)
- Anamneses (resumo IA + pontos de atenção)
- Registrar Peso (histórico + gráfico)
- Consultas agendadas + históricas (Próximas / Histórico)
- Videoconsultas (Jitsi)
- Check-in diário (mood, energia, sono, notas)
- Tarefas do nutricionista (toggle DONE/PENDING)

**Dashboard do Nutricionista**
- 6 KPIs linkados: pacientes, anamneses novas, revisadas, consultas semana, pontos de atenção, msgs não-lidas
- Timeline 360° do paciente
- Agenda com criação, edição, exclusão e notas clínicas ao marcar como realizada
- Histórico de consultas por paciente (`/consultas/page.tsx`)
- Painel de Bem-estar (`/ferramentas/bem-estar`): tabela de engajamento + lista sem check-in
- Alertas de humor baixo no dashboard (mood ≤2 nos últimos 2 dias)
- Badge de engajamento no prontuário (barra semanal 7 dias + Alta/Média/Baixa)
- Filtro de engajamento + ordenação na lista de pacientes
- Coluna "Última Consulta" e "Humor" na tabela de pacientes
- Relatório clínico com KPIs gerais + gráfico de consultas por mês (recharts)
- Oficina de Planos (drag & drop, SmartPaste, TACO, PDF)
- Calculadora TMB+VET Mifflin-St Jeor
- Análise IA do paciente (Groq/LLaMa)
- Adipômetro (7 protocolos)
- Export CSV (4 tipos + bem-estar)
- Equipe (convites, membros)
- Google Calendar OAuth2 sincronizado
- Emails transacionais (confirmação consulta, boas-vindas, anamnese, ativação portal)
- Chat com paciente (polling 15s + marcar como lido ao abrir)
- **Tags de pacientes**: sistema de tags coloridas (criar/deletar por paciente, filtro na lista)
- **Agenda**: editar notas em consultas DONE/CANCELED; botão "Sala" para consultas ONLINE agendadas
- **Floating Assistant**: Assistente NutriOpus (IA com Groq/Ollama/OpenRouter), dock de 2 botões, mini janelas arrastáveis de ferramentas

**Portal do Paciente (adições novas)**
- Check-in diário de bem-estar (mood 1-5, energia 1-5, sono, notas)
- Página de tarefas do nutricionista (toggle DONE/PENDING, prioridade, prazo)
- Lembretes do nutricionista visíveis em Metas
- Gráfico de bem-estar na evolução (recharts LineChart)
- "Semana em Destaque" no home: streak, humor médio, metas alcançadas, barra 7 dias
- Cards de progresso na evolução: variação de peso/gordura + total avaliações
- Página pública com "Já sou paciente" link + prova social (X pacientes em acompanhamento)

**Segurança**
- `assertTenantAccess` em todas as rotas do dashboard
- `assertPatientAccess` em todas as actions do portal
- `passwordHash` nunca exposto
- `activationToken` nunca retornado ao cliente
- Guards nas APIs de IA
- Multi-tenant isolado por slug

**LGPD**
- Página `/privacidade` com 8 seções
- Consentimento explícito na pré-consulta
- Link em todos os footers públicos
