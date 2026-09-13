# Patient Portal Redesign

## Problema inicial
O portal do paciente era funcional mas visualmente fraco. Parecia outro sistema, sem identidade NutriOpus. A sidebar era genérica sem logo, sem header, sem seletor de tema avançado, sem idioma. O dashboard era uma grade fria de cards.

## Objetivo
Transformar o Portal do Paciente em uma área oficial, moderna e acolhedora do NutriOpus, mantendo toda a funcionalidade existente.

## Novo layout

```
PatientPortalShell (client, gerencia estado de colapso da sidebar)
├── PatientPortalSidebar (desktop, recolhível via localStorage)
│   ├── Logo NutriOpus (link para /))
│   ├── Label "Portal do Paciente" + nome do paciente
│   ├── Nav links (12 seções)
│   └── Botão de logout + colapso
├── PatientPortalHeader (sticky top bar)
│   ├── Título/subtítulo da página atual
│   ├── LangToggle (PT/EN/ES)
│   ├── ThemeToggle (6 temas avançados)
│   └── Avatar + nome + logout
├── main (children — conteúdo das páginas)
├── PatientPortalMobileNav (mobile bottom nav + drawer)
└── PatientFloatingDock (IA + ferramentas flutuantes)
    ├── PatientAIAssistantChat (IA restrita ao escopo do paciente)
    └── Tools drawer (TACO, peso, check-in, cardápio, diário, WhatsApp)
```

## Dashboard de evolução

Novas seções:
- **Saudação com nutricionista**: nome + foto/avatar da nutricionista no canto
- **Semana em destaque**: streak de check-ins + humor médio + metas alcançadas + barra de 7 dias
- **Próxima consulta**: data, horário, dias restantes + CTA WhatsApp se vazia
- **Evolução de peso**: último peso + delta vs. medição anterior + mini-gráfico de barras + botões de ação
- **Cardápio de hoje**: plano ativo com refeições listadas + estado vazio com CTA WhatsApp
- **Resumo rápido**: Diário, Check-in, Chat (com badge de não lidos), Tarefas (com badge)
- **Ações rápidas**: 6 botões (peso, refeição, cardápio, chat, TACO, evolução)
- **Links adicionais**: Arquivos, Agenda, Videoconsultas

## Próximas consultas

- Exibido em destaque no dashboard
- Mostra data, horário e contagem regressiva
- Se não houver consulta: CTA para WhatsApp da nutricionista (se disponível) ou Chat

## WhatsApp para marcar consulta

Criado: `src/lib/utils/whatsapp.ts`

```ts
buildWhatsAppUrl(phone, message) // URL base do WhatsApp
buildScheduleWhatsAppUrl(phone, patientName) // "Olá, sou [nome] e gostaria de marcar uma consulta."
```

Usada em:
- Dashboard (card de próxima consulta vazia)
- Dashboard (card de cardápio vazio)
- PatientFloatingDock (tool "Marcar consulta")

## Sidebar recolhível

- Estado salvo em `localStorage` (`nutriopus-portal-sidebar-collapsed`)
- Desktop expandido (w-64): logo, nome do paciente, nav com ícone + label, botão colapso
- Desktop recolhido (w-[60px]): apenas ícones com tooltip via `title`
- Mobile: não aparece (usa PatientPortalMobileNav no bottom)
- Sem hydration mismatch (state inicializado no useEffect)

## Header com tema e idioma

- `PatientPortalHeader` com:
  - LangToggle (PT/EN/ES — mesmo componente da landing)
  - ThemeToggle (6 temas — mesmo componente da landing/dashboard)
  - Avatar com inicial + nome abreviado + botão logout

## Ferramentas flutuantes do paciente

`PatientFloatingDock`:
- Botão IA (azul, bot icon)
- Botão Ferramentas (cinza, wrench icon)
- Ambos fixos canto inferior direito

Tools disponíveis (nunca administrativas):
- TACO / Calorias → `/calculadora`
- Registrar peso → `/peso`
- Check-in rápido → `/checkin`
- Ver cardápio → `/cardapio`
- Registrar refeição → `/diario`
- Marcar consulta (WhatsApp) → apenas se nutritionistWhatsApp disponível

## IA do paciente

`PatientAIAssistantChat` com action `askPatientAIAction`:
- Prompt separado: `PATIENT_AI_SYSTEM_PROMPT` em `src/lib/ai/patient-ai-system-prompt.ts`
- Reusa o mesmo AI provider (Ollama/Groq/etc.) mas com contexto restrito
- Sem acesso a dados de outros pacientes
- Sem acesso ao painel da nutricionista
- Histórico salvo em localStorage separado (`nutriopus-patient-ai-{tenant}`)
- Sugestões rápidas de navegação
- Se provider não configurado: mensagem honesta de indisponibilidade

**O que a IA pode fazer:**
- Explicar como usar o portal
- Orientar navegação
- Lembrar de registrar peso, refeições, check-ins
- Explicar termos simples

**O que a IA recusa:**
- Diagnóstico médico/nutricional
- Prescrição de dieta
- Alteração de plano alimentar
- Interpretação de exames

## Segurança

- Layout verifica `session.nutritionistSlug === tenant` antes de renderizar o shell
- `askPatientAIAction` verifica sessão do paciente e slug do tenant
- AI service não acessa dados de outros pacientes
- Prompt do sistema proíbe explicitamente ações administrativas
- Login e ativar-acesso renderizam sem PatientPortalShell (sem nav)

## i18n

Chaves adicionadas em pt/en/es:
- `patient_portal.home.*`
- `patient_portal.nav.*` (12 itens + more + logout)
- `patient_portal.dashboard.*` (26 chaves)
- `patient_portal.tools.*` (8 chaves)
- `patient_portal.ai.*` (5 chaves + 5 suggestions)
- `patient_portal.header.*`

## Responsividade

- Mobile: bottom nav com 4 primários + drawer "Mais" com resto
- Drawer "Mais" inclui LangToggle + ThemeToggle
- Sidebar esconde no mobile
- Dashboard mobile-first com grid responsivo
- Quick actions: 2 col mobile → 3 col sm → 6 col lg

## Limitações

- `pageTitle`/`pageSubtitle` no header mostram string estática passada pelo layout (sem lógica de rota atual)
- Mini-gráfico de peso usa barras simples (não Chart.js) para evitar bundle pesado
- Sidebar Shell detecta colapso via Storage event — pode ter 1 frame de delay no resize
- Ferramentas "água" e "IMC" não criadas como modais inline (linkam para calculadora TACO)

## Próximos passos

1. Passar `pageTitle` dinâmico baseado na rota atual para o header
2. Criar mini ferramenta de IMC/água como modal inline no PatientFloatingDock
3. Considerar notificações push (PWA) para lembrete de check-in
4. Internacionalizar textos ainda hardcoded no dashboard server-rendered
