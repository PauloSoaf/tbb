# Dashboard Operacional

## Objetivo

Transformar o dashboard inicial da nutricionista em uma central diaria de atendimento, acompanhamento e acao rapida.

## Benchmarks

Referencias consideradas: WebDiet, Dietbox, Nutrium, Doctoralia, Google Calendar, Linear, Notion e Apple Health.

Padroes aproveitados:

- agenda do dia visivel;
- proximas consultas com horario e paciente;
- acoes diretas em cards;
- alertas clinicos compactos;
- pendencias e mensagens em destaque;
- mobile com cards, sem tabelas.

## Novas Secoes

- Cards de resumo com status operacional.
- Agenda de hoje.
- Proximas consultas.
- Ultimas anamneses.
- Pontos de atencao.
- Mensagens nao lidas.
- Pacientes que precisam de acao.
- Atalhos e compartilhamento de pre-consulta.

## Dados Carregados

O dashboard usa `src/services/dashboard.service.ts` com queries filtradas por `nutritionistId`:

- `getDashboardStats`
- `getTodayAppointments`
- `getUpcomingAppointments`
- `getRecentAnamneses`
- `getRecentAttentionPoints`
- `getPatientsNeedingAction`
- `getUnreadMessagesSummary`

## Componentes

- `TodayAppointmentsCard`
- `UpcomingAppointmentsList`
- `AppointmentDashboardItem`
- `PatientsNeedingActionList`
- `UnreadMessagesPanel`
- `DashboardQuickActions`
- `DashboardEmptyState`
- `CopyPreConsultationLinkCard`

## Regras de Tenant

Todas as queries recebem `nutritionistId` da sessao validada por `assertTenantAccess`. Nenhuma consulta usa apenas slug vindo do client.

## Performance

- A pagina continua sendo Server Component.
- As consultas independentes rodam em `Promise.all`.
- Listas sao limitadas.
- As queries usam `select` nos dados novos para evitar cargas grandes.

## Proximos Passos

- Criar acao segura para gerar atendimento direto a partir de consulta online.
- Separar secoes em Suspense granular se o volume de dados crescer.
- Consolidar mensagens de chat e care-session em um unico resumo.
