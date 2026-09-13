# NutriOpus

SaaS para nutricionistas — gestão clínica completa com portal do paciente, prontuário 360, planos alimentares, agenda, atendimentos online com transcrição e assistente de IA.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 + variáveis CSS |
| Banco | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| Validação | Zod 4 |
| Auth | JWT em cookie httpOnly (jose) |
| Cache | Next.js Data Cache (`unstable_cache`) + Router Cache |
| Testes | Vitest |
| Datas | date-fns |
| Ícones | Lucide React |

---

## Início rápido (local com Docker)

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Subir o banco PostgreSQL local
docker compose up -d

# 4. Aplicar schema e gerar cliente Prisma
npx prisma db push
npm run prisma:generate

# 5. Popular com dados iniciais
npm run prisma:seed

# 6. Iniciar o servidor
npm run dev
```

Acesse `http://localhost:3000`

**Usuário seed:**
| Campo | Valor |
|-------|-------|
| E-mail | `teste@nutriopus.com` |
| Senha | `123456` |
| Tenant | `teste` |

---

## Início rápido (Supabase)

```bash
# 1. Criar projeto em supabase.com e copiar a DATABASE_URL (connection pooling)
# 2. Configurar .env com a URL do Supabase

# NÃO usar prisma migrate dev com Supabase (shadow database conflict)
# Usar sempre:
npx prisma db push

# Gerar cliente após qualquer mudança no schema
npm run prisma:generate

# Seed (opcional)
npm run prisma:seed
```

> **Importante:** No Windows, encerre o `npm run dev` antes de rodar `prisma generate`
> para evitar lock na DLL do query engine.

---

## Comandos

### Desenvolvimento

```bash
npm run dev           # Servidor de desenvolvimento (Turbopack)
npm run build         # Build de produção (gera Prisma + Next build)
npm run start         # Servidor de produção
npm run lint          # ESLint
npm run test          # Rodar testes (Vitest, modo único)
npm run test:watch    # Testes em modo watch
```

### Prisma

```bash
npm run prisma:generate    # Gerar/atualizar cliente Prisma
npm run prisma:migrate     # Criar migration (somente local com shadow DB)
npm run prisma:deploy      # Aplicar migrations em produção
npm run prisma:seed        # Popular banco com dados iniciais
npm run prisma:studio      # Abrir Prisma Studio (UI do banco)
npx prisma db push         # Sincronizar schema sem migration (Supabase)
npx prisma migrate reset   # Reset completo (local apenas)
```

### Docker

```bash
docker compose up -d       # Subir PostgreSQL local
docker compose down        # Parar banco
docker compose down -v     # Parar e apagar volume
docker compose logs -f     # Ver logs do banco
```

---

## Variáveis de ambiente

Copiar `.env.example` para `.env` e preencher:

```env
# Banco (Supabase pooler ou PostgreSQL local)
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=segredo-longo-e-aleatorio

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Storage (uploads locais ou S3-compatible)
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=public/uploads

# Assistente IA (opcional)
AI_PROVIDER=disabled           # disabled | ollama | openrouter | groq
AI_MODEL=
AI_API_KEY=

# Transcrição (opcional)
TRANSCRIPTION_ENABLED=false
TRANSCRIPTION_PROVIDER=MANUAL  # MANUAL | CUSTOM_HTTP | OPENAI_WHISPER_API
CUSTOM_TRANSCRIPTION_HTTP_URL=
OPENAI_API_KEY=
```

---

## Demo mode

Demonstração interativa pública, acessível pelo botão "Ver demo interativa" na landing.

Rotas:
- `/demo/dashboard` — visão da nutricionista
- `/demo/portal` — visão do paciente

Características:
- sem backend (zero Prisma, zero Supabase, zero server actions)
- dados mockados (`src/demo/demo-data.ts`)
- ações locais persistidas em `localStorage` + botão "Resetar demo"
- alternância nutricionista ⇄ paciente no banner fixo
- call nativa desabilitada (aviso "indisponível na demo")
- `noindex` na demo interna

Docs: `docs/DEMO_MODE_2026-07-05.md`.

## Rotas

### Públicas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page do NutriOpus |
| `/demo/dashboard` · `/demo/portal` | Demo interativa com dados fictícios |
| `/login` | Login da nutricionista |
| `/cadastro` | Cadastro de nova nutricionista |
| `/convite/[token]` | Aceitar convite de equipe |
| `/[tenant]` | Página pública da nutricionista |
| `/[tenant]/pre-consulta` | Anamnese digital pré-consulta |

### Dashboard da nutricionista — `/dashboard/[tenant]`

| Rota | Descrição |
|------|-----------|
| `/dashboard/[tenant]` | Painel com stats e atalhos |
| `/dashboard/[tenant]/pacientes` | Lista de pacientes |
| `/dashboard/[tenant]/pacientes/novo` | Cadastro manual |
| `/dashboard/[tenant]/pacientes/[id]` | Prontuário 360 |
| `/dashboard/[tenant]/pacientes/[id]/medidas` | Antropometria e dobras |
| `/dashboard/[tenant]/pacientes/[id]/planos` | Planos alimentares |
| `/dashboard/[tenant]/pacientes/[id]/planos/[planId]` | Editor de plano |
| `/dashboard/[tenant]/pacientes/[id]/anamnese` | Anamneses do paciente |
| `/dashboard/[tenant]/pacientes/[id]/chat` | Chat com o paciente |
| `/dashboard/[tenant]/pacientes/[id]/diario` | Diário alimentar |
| `/dashboard/[tenant]/pacientes/[id]/consultas` | Consultas do paciente |
| `/dashboard/[tenant]/pacientes/[id]/compras` | Lista de compras |
| `/dashboard/[tenant]/pacientes/[id]/adesao` | Adesão ao plano |
| `/dashboard/[tenant]/pacientes/[id]/arquivos` | Arquivos e documentos |
| `/dashboard/[tenant]/pacientes/[id]/relatorio` | Relatório clínico |
| `/dashboard/[tenant]/agenda` | Agenda de consultas |
| `/dashboard/[tenant]/lembretes` | Central de lembretes dos pacientes |
| `/dashboard/[tenant]/atendimentos` | Atendimentos online |
| `/dashboard/[tenant]/atendimentos/[id]` | Sala de atendimento |
| `/dashboard/[tenant]/anamnese/[id]` | Detalhe de anamnese |
| `/dashboard/[tenant]/equipe` | Gestão de equipe |
| `/dashboard/[tenant]/ferramentas` | Hub de ferramentas |
| `/dashboard/[tenant]/ferramentas/taco` | Busca TACO |
| `/dashboard/[tenant]/ferramentas/calculadoras` | Calculadoras clínicas |
| `/dashboard/[tenant]/ferramentas/modelos` | Modelos de plano |
| `/dashboard/[tenant]/ferramentas/oficina-planos` | Estúdio de planos |
| `/dashboard/[tenant]/ferramentas/comparar-pacientes` | Comparação de pacientes |
| `/dashboard/[tenant]/ferramentas/bem-estar` | Check-ins de bem-estar |
| `/dashboard/[tenant]/config` | Configurações da página pública |

### Portal do paciente — `/portal/[tenant]`

| Rota | Descrição |
|------|-----------|
| `/portal/[tenant]` | Painel do paciente |
| `/portal/[tenant]/login` | Login do paciente |
| `/portal/[tenant]/ativar-acesso` | Ativar acesso pelo convite |
| `/portal/[tenant]/cardapio` | Cardápio/plano ativo |
| `/portal/[tenant]/cardapio/[planId]` | Detalhe do plano |
| `/portal/[tenant]/diario` | Diário alimentar |
| `/portal/[tenant]/evolucao` | Evolução corporal |
| `/portal/[tenant]/peso` | Histórico de peso |
| `/portal/[tenant]/metas` | Metas e objetivos |
| `/portal/[tenant]/tarefas` | Tarefas da nutricionista |
| `/portal/[tenant]/checkin` | Check-in de bem-estar |
| `/portal/[tenant]/agenda` | Consultas agendadas |
| `/portal/[tenant]/atendimentos` | Atendimentos online |
| `/portal/[tenant]/chat` | Chat com a nutricionista |
| `/portal/[tenant]/compras` | Lista de compras |
| `/portal/[tenant]/anamnese` | Anamnese do paciente |
| `/portal/[tenant]/arquivos` | Arquivos compartilhados |
| `/portal/[tenant]/calculadora` | Calculadora nutricional |

---

## Arquitetura

```
src/
├── app/                          # Next.js App Router
│   ├── [tenant]/                 # Páginas públicas
│   ├── dashboard/[tenant]/       # Dashboard da nutricionista
│   ├── portal/[tenant]/          # Portal do paciente
│   ├── login/ cadastro/          # Auth
│   └── api/                      # API routes (logout, uploads)
│
├── actions/                      # Server Actions (mutações)
│
├── components/
│   ├── layout/                   # Sidebar, Header, MobileNav, Breadcrumbs
│   ├── care-session/             # Sala de atendimento
│   ├── transcriptions/           # Módulo de transcrição
│   ├── patient-record/           # Prontuário 360 e sub-módulos
│   ├── meal-plan/                # Planos alimentares e editor
│   ├── appointments/             # Agenda
│   ├── providers/                # AppProviders (i18n, QueryClient, Theme)
│   └── ui/                       # Componentes base compartilhados
│
├── services/                     # Queries Prisma e regras de negócio
│   ├── transcription/            # Providers de transcrição
│   └── *.service.ts
│
├── lib/
│   ├── auth/                     # JWT, session, cookies, password
│   ├── tenancy/                  # assertTenantAccess, getTenantBySlug
│   ├── cache/                    # Cache tags, invalidação, dashboard-cache
│   ├── i18n/                     # Textos PT/EN/ES e I18nContext
│   ├── query/                    # TanStack Query client e keys
│   └── utils/                   # calculateAge, calculateBMI, formatters
│
└── validation/                   # Schemas Zod
```

---

## Padrões de backend

### Multi-tenant

Toda query privada é isolada por `nutritionistId`:

```ts
// Sempre buscar session da nutricionista autenticada
const { session } = await assertTenantAccess(tenantSlug)
const nutritionistId = session.nutritionistId  // nunca do client

// Toda query filtra por nutritionistId
await prisma.patient.findMany({ where: { nutritionistId } })
```

Regras:
- `nutritionistId` **nunca** vem do corpo da requisição — sempre da sessão
- Paciente só acessa dados do próprio prontuário
- Portal filtra por `patientId` derivado do cookie de sessão do paciente

### Server Actions

Todas as mutações são Server Actions em `src/actions/*.action.ts`:

```ts
"use server"

export async function exampleAction(tenantSlug: string, data: unknown) {
  // 1. Validar tenant e obter nutritionistId
  const { session } = await assertTenantAccess(tenantSlug)

  // 2. Validar input com Zod
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  // 3. Executar via service (nunca Prisma direto na action)
  const result = await serviceFunction(session.nutritionistId, parsed.data)

  // 4. Invalidar cache
  invalidatePatientDetail({ nutritionistId: session.nutritionistId, tenant: tenantSlug, patientId })

  return { success: true, data: result }
}
```

### Cache

| Camada | Tecnologia | TTL |
|--------|-----------|-----|
| Router Cache (client) | `staleTimes.dynamic` | 300s |
| Data Cache (server) | `unstable_cache` | 30–300s por domínio |
| Client state | TanStack Query | staleTime 5min |

Invalidação via helper central:

```ts
import { invalidatePatientDetail, invalidateAfterAppointmentMutation } from "@/lib/cache/invalidate-nutriopus-cache"

// Usar a função de domínio correta — nunca revalidatePath espalhado
invalidatePatientDetail({ nutritionistId, tenant, patientId })
```

### Validação Zod 4

```ts
// Usar .issues em vez de .errors (Zod 4)
const parsed = schema.safeParse(data)
if (!parsed.success) {
  const message = parsed.error.issues[0]?.message ?? "Erro de validação"
}
```

### Serviços

Toda lógica de banco fica em `src/services/*.service.ts`. Actions chamam services, nunca Prisma diretamente (exceto casos triviais de uma linha).

---

## i18n

Três idiomas: **Português (PT)**, **English (EN)**, **Español (ES)**.

Arquivos: `src/lib/i18n/pt.json`, `en.json`, `es.json`

Uso em client components:

```tsx
import { useI18n } from "@/lib/i18n/I18nContext"

function Component() {
  const { t } = useI18n()
  return <p>{t("patients.title")}</p>
}
```

Uso em server components:

```tsx
import { getServerTranslations } from "@/lib/i18n/server"

async function Page() {
  const t = await getServerTranslations()
  return <h1>{t("dashboard.title")}</h1>
}
```

**Regra:** nenhum texto hardcoded em área que usa i18n. Chaves devem existir nos três arquivos.

---

## Tema e identidade visual

### Tokens de cor (CSS variables)

| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `#F8F4EC` | Fundo principal |
| `--card` | `#FFFFFF` | Cards e painéis |
| `--surface-warm` | `#FFF9F0` | Superfícies quentes |
| `--surface-muted` | `#F3EBDD` | Bege suave |
| `--primary` | `#2563EB` | Botão principal, links |
| `--primary-hover` | `#1D4ED8` | Hover do primário |
| `--primary-subtle` | `#DBEAFE` | Fundo de badge azul |
| `--foreground` | `#111827` | Texto principal |
| `--muted-foreground` | `#64748B` | Texto secundário |
| `--border` | `#E2E8F0` | Bordas neutras |
| `--clinical-alert` | `#FFF3D6` | Alertas clínicos |

### Modo escuro

Suporte a dark mode via `class="dark"` no `<html>`. Usar sempre classes Tailwind semânticas (`bg-background`, `text-foreground`, `border-border`) — nunca cores fixas como `bg-white` ou `text-gray-800`.

### Padrão de layout

```
┌─────────────────────────────────────────┐
│ DashboardHeader (título + subtítulo)    │
├─────────────────────────────────────────┤
│                                         │
│  Cards brancos sobre fundo bege         │
│  rounded-xl · border · shadow-sm        │
│  gap-4/6 · p-4/6                       │
│                                         │
│  Ação principal: botão azul             │
│  Estado vazio: ícone + texto + CTA      │
│  Loading: skeleton (nunca spinner puro) │
│                                         │
└─────────────────────────────────────────┘
```

---

## Módulos principais

| Módulo | Localização | Descrição |
|--------|-------------|-----------|
| Prontuário 360 | `components/patient-record/` | Linha do tempo, notas, tarefas, alertas |
| Planos alimentares | `components/meal-plan/` | Editor, TACO, substituições, PDF |
| Antropometria | `components/measurements/` | Dobras cutâneas, gráficos, relatório |
| Agenda | `components/appointments/` | Semana, mês, consultas, status |
| Atendimento | `components/care-session/` | Sala digital com chat e transcrição |
| Transcrição | `components/transcriptions/` | Multi-provider, consent, LGPD |
| Assistente IA | `components/ai/` | Drawer lateral, providers configuráveis |
| Portal do paciente | `app/portal/` | Mobile-first, cardápio, diário, chat |
| Diário alimentar | `components/food-diary/` | Refeições, adesão, feedback clínico |
| Lista de compras | `components/shopping-list/` | Gerada do plano, checklist, cópia |
| TACO | `components/taco/` | Busca e consulta da tabela TACO |

---

## Testes

```bash
npm run test           # Rodar todos os testes
npm run test:watch     # Modo watch
npx vitest run --reporter verbose   # Output detalhado
```

Arquivos de teste em `src/**/*.test.ts`. Usar Vitest com `describe / it / expect`.

---

## Docs técnicas

| Arquivo | Conteúdo |
|---------|---------|
| `docs/TRANSCRIPTIONS.md` | Módulo de transcrição completo |
| `docs/TRANSCRIPTION_PROVIDERS.md` | Configuração de cada provider |
| `docs/TRANSCRIPTION_PRIVACY_AND_LGPD.md` | LGPD, consentimento, retenção |
| `docs/NEXT_VS_SPA_NAVIGATION_EXPLANATION.md` | Cache e navegação App Router |
| `docs/FLOATING_ASSISTANT_AND_TOOLS.md` | Assistente IA e dock de ferramentas |
| `docs/STORAGE_STRATEGY.md` | Storage local vs S3 |
| `collab-IAS-REPORT.md` | Log de sprints e decisões técnicas |

---

## Regras que não podem ser quebradas

- Nunca fazer `push` automático para o repositório remoto
- Nunca fazer commit automático
- Nunca usar Supabase SDK — Prisma puro
- Nunca atualizar Prisma para versão 7 ou preview
- Nunca expor `passwordHash` em nenhuma resposta
- Nunca cachear sem incluir `nutritionistId` na key
- Nunca gravar áudio sem consentimento explícito registrado
- Nunca enviar áudio para provider externo sem consentimento
- Nunca hardcodar texto sem i18n em área que usa i18n
- Nunca usar `prisma migrate dev` no Supabase — usar `prisma db push`
- Nunca alterar o schema Prisma sem necessidade real
