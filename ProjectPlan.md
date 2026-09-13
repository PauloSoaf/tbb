# NutriOpus

## Plano de projeto

## 1. Visão geral

O NutriOpus é uma plataforma SaaS para nutricionistas, criada para organizar o atendimento antes mesmo da primeira consulta. A proposta central é permitir que cada nutricionista tenha uma página pública personalizada, receba pré-consultas digitais, visualize anamneses organizadas e acompanhe seus pacientes em um dashboard privado.

A primeira versão do projeto será focada em entregar um MVP funcional, seguro e bem estruturado, usando uma stack moderna baseada em Next.js, Prisma e PostgreSQL.

## 2. Proposta de valor

O NutriOpus resolve um problema comum na rotina de nutricionistas: a desorganização das informações do paciente antes da consulta.

Em vez de receber dados por WhatsApp, formulários soltos ou anotações manuais, a nutricionista terá um fluxo centralizado:

| Etapa | Valor gerado |
|---|---|
| Página pública personalizada | Facilita o acesso do paciente à pré-consulta |
| Formulário de anamnese digital | Coleta informações relevantes antes do atendimento |
| Dashboard privado | Organiza pacientes, respostas e pontos de atenção |
| Resumo automático | Reduz o tempo de leitura da anamnese |
| Cálculo de idade e IMC | Apoia a análise inicial do paciente |
| Multi-tenant | Permite que o produto escale para várias nutricionistas |

## 3. Objetivo do MVP

Criar a primeira versão funcional do app web NutriOpus, com foco em:

1. Página pública de uma nutricionista.
2. Formulário público de pré-consulta.
3. Cadastro automático ou atualização de paciente.
4. Salvamento da anamnese no banco de dados.
5. Geração de resumo simples da anamnese.
6. Extração de pontos de atenção.
7. Login seguro da nutricionista.
8. Dashboard privado.
9. Listagem de pacientes.
10. Detalhe do paciente.
11. Visualização completa da anamnese.
12. Isolamento de dados por tenant.

## 4. Escopo da primeira versão

A versão inicial não será um sistema completo de gestão clínica. Ela será uma base sólida para validar o produto, testar a experiência da nutricionista e preparar a evolução para agenda, documentos, plano alimentar e relatórios.

### Dentro do escopo

| Módulo | Entrega |
|---|---|
| Landing institucional | Página inicial simples do NutriOpus |
| Página pública da nutricionista | Rota pública com dados da profissional |
| Pré-consulta digital | Formulário público com etapas |
| Banco PostgreSQL | Persistência real dos dados |
| Prisma | ORM e fonte da verdade do schema |
| Autenticação | Login com senha e sessão JWT em cookie httpOnly |
| Dashboard | Visão geral dos pacientes e anamneses |
| Pacientes | Lista e detalhe dos pacientes |
| Anamnese | Visualização detalhada da resposta enviada |
| Multi-tenancy | Isolamento por nutritionistId |
| Seed | Nutricionista e usuário de teste |
| Design | Interface branca, azul e bege |

### Fora do escopo inicial

| Item | Motivo |
|---|---|
| Cadastro público de nutricionistas | Será tratado em versão futura |
| Pagamentos e assinatura | Não é necessário para validar o MVP |
| Upload de exames | Model será criado, mas tela pode ficar para depois |
| Plano alimentar completo | Feature futura |
| App mobile | Faz parte da visão do produto, mas não do MVP web inicial |
| Integração com IA externa | O MVP terá resumo determinístico simples |
| Integração com WhatsApp oficial | Inicialmente será apenas link de contato |
| Agenda completa | Model pode existir, mas tela pode ser simples ou futura |

## 5. Público alvo

O público inicial são nutricionistas que desejam profissionalizar o atendimento e reduzir a bagunça antes da primeira consulta.

### Perfil inicial

| Perfil | Necessidade |
|---|---|
| Nutricionista autônoma | Organizar pacientes e pré-consultas |
| Nutricionista em consultório | Padronizar coleta de informações |
| Profissional em início de carreira | Ter presença digital simples e profissional |
| Nutricionista com alta demanda | Ganhar tempo antes da consulta |

## 6. Tenant inicial

Para desenvolvimento, validação e demonstração, o sistema terá uma nutricionista inicial criada via seed.

| Campo | Valor |
|---|---|
| Slug | fabiola |
| Nome | Fabíola Amorim |
| CRN | CRN-7 00000 |
| Cidade | Manaus |
| Estado | AM |
| Especialidades | Emagrecimento, Saúde intestinal, Saúde da mulher, Reeducação alimentar |
| E-mail de login | fabiola@nutriopus.com |
| Senha | 123456 |

Rotas principais desse tenant:

| Rota | Finalidade |
|---|---|
| /fabiola | Página pública |
| /fabiola/pre-consulta | Formulário público |
| /fabiola/pre-consulta/sucesso | Confirmação de envio |
| /dashboard/fabiola | Dashboard privado |

## 7. Stack técnica

| Tecnologia | Uso no projeto |
|---|---|
| Next.js com App Router | Framework fullstack |
| TypeScript | Tipagem estática |
| TailwindCSS | Estilização |
| shadcn/ui | Componentes base |
| React Hook Form | Controle dos formulários |
| Zod | Validação de entrada |
| Prisma | ORM e migrations |
| PostgreSQL | Banco de dados |
| bcryptjs ou bcrypt | Hash de senha |
| jose | Sessão JWT |
| lucide-react | Ícones |
| date-fns ou dayjs | Manipulação de datas |
| Docker Compose | Banco local de desenvolvimento |

## 8. Decisões técnicas

### Banco de dados

O PostgreSQL será usado como banco principal, rodando localmente via Docker Compose durante o desenvolvimento.

O Prisma será a fonte da verdade do schema. Isso significa que o schema principal não deve ser mantido por SQL manual separado.

Arquivos esperados:

| Arquivo | Finalidade |
|---|---|
| prisma/schema.prisma | Definição dos models |
| prisma/seed.ts | Dados iniciais |
| .env.example | Exemplo de DATABASE_URL |
| docker-compose.yml | PostgreSQL local |
| src/lib/prisma.ts | Cliente Prisma reutilizável |

### Autenticação

A autenticação será própria e simples, adequada para o MVP.

Fluxo:

1. Usuário informa e-mail e senha.
2. Sistema busca o usuário pelo e-mail.
3. Senha é comparada com hash usando bcryptjs ou bcrypt.
4. Se válida, o sistema cria um JWT com jose.
5. O JWT é salvo em cookie httpOnly.
6. Rotas privadas validam a sessão server-side.
7. Logout remove o cookie.

A sessão deve proteger especialmente as rotas iniciadas por:

```txt
/dashboard
```

### Multi-tenancy

O sistema será multi-tenant desde o início.

A regra central é:

```txt
Toda consulta privada precisa filtrar por nutritionistId.
```

Models que precisam de nutritionistId:

1. Patient.
2. AnamneseResponse.
3. Appointment.
4. PatientMeasurement.
5. Document.

Isso evita vazamento de dados entre nutricionistas.

Helpers esperados:

| Helper | Responsabilidade |
|---|---|
| getTenantBySlug | Buscar a nutricionista pelo slug |
| assertTenantAccess | Garantir que o usuário pode acessar o tenant |
| getCurrentNutritionistFromSession | Recuperar a nutricionista da sessão |

## 9. Identidade visual

O NutriOpus deve ter uma interface clínica, leve, acolhedora e profissional.

### Paleta obrigatória

| Uso | Cor |
|---|---|
| Fundo principal | #F8F4EC |
| Superfície quente | #FFF9F0 |
| Bege suave | #F3EBDD |
| Cards | #FFFFFF |
| Azul principal | #2563EB |
| Azul hover | #1D4ED8 |
| Azul suave | #DBEAFE |
| Texto principal | #111827 |
| Texto secundário | #64748B |
| Borda neutra | #E2E8F0 |
| Atenção | #FFF3D6 |

### Diretrizes de UI

1. Usar cards brancos sobre fundo bege.
2. Usar azul para CTAs, links principais e navegação ativa.
3. Usar bege ou âmbar para pontos de atenção clínica.
4. Priorizar layout mobile-first.
5. No mobile, tabelas devem virar cards.
6. Evitar telas totalmente brancas ou cinzas sem presença do bege.
7. Manter espaçamento generoso e boa legibilidade.
8. Não colocar regra de negócio pesada dentro de componentes visuais.

## 10. Arquitetura de pastas

Estrutura sugerida:

```txt
src/
  actions/
    auth.actions.ts
    anamnese.actions.ts
    review.actions.ts

  app/
    [tenant]/
      page.tsx
      pre-consulta/
        page.tsx
        sucesso/
          page.tsx

    dashboard/
      [tenant]/
        page.tsx
        pacientes/
          page.tsx
          [patientId]/
            page.tsx
        anamnese/
          [responseId]/
            page.tsx

    login/
      page.tsx

    api/

  components/
    dashboard/
      StatsCard.tsx
      AttentionBadge.tsx
      AnamneseSummaryCard.tsx

    forms/
      PreConsultationForm.tsx

    layout/
      DashboardSidebar.tsx
      DashboardHeader.tsx
      MobileBottomNav.tsx

    patients/
      PatientTable.tsx
      PatientMobileCard.tsx

    public/
      PublicHero.tsx
      NutritionistCard.tsx

    ui/

  lib/
    auth/
      cookies.ts
      password.ts
      session.ts

    tenancy/
      assertTenantAccess.ts
      getTenantBySlug.ts

    utils/
      calculateAge.ts
      calculateBMI.ts
      classifyBMI.ts
      generateAnamneseSummary.ts
      extractAttentionPoints.ts

    prisma.ts

  services/
    auth.service.ts
    nutritionist.service.ts
    patient.service.ts
    anamnese.service.ts
    dashboard.service.ts

  validation/
    auth.schema.ts
    patient.schema.ts
    anamnese.schema.ts
    nutritionist.schema.ts
```

## 11. Models principais

### Nutritionist

Representa a nutricionista dona do tenant.

Campos mínimos:

```txt
id
slug único
name
crn
bio
whatsapp
email
clinicAddress
city
state
profileImageUrl opcional
themePrimaryColor
specialties como String[]
createdAt
updatedAt
```

### User

Representa o usuário que acessa o dashboard.

```txt
id
nutritionistId
name
email único
passwordHash
role
createdAt
updatedAt
```

Roles:

```txt
ADMIN
NUTRITIONIST
ASSISTANT
```

### Patient

Representa o paciente.

```txt
id
nutritionistId
name
email opcional
phone
birthDate opcional
weight opcional
height opcional
goal opcional
notes opcional
status
createdAt
updatedAt
```

Status:

```txt
ACTIVE
INACTIVE
ARCHIVED
```

### AnamneseResponse

Representa uma resposta de pré-consulta.

```txt
id
nutritionistId
patientId
payload Json
summary opcional
attentionPoints String[]
status
submittedAt
createdAt
updatedAt
```

Status:

```txt
NEW
REVIEWED
ARCHIVED
```

### Appointment

Representa consultas agendadas.

```txt
id
nutritionistId
patientId
date
startTime opcional
endTime opcional
mode
status
notes opcional
createdAt
updatedAt
```

Mode:

```txt
ONLINE
PRESENTIAL
```

Status:

```txt
SCHEDULED
DONE
CANCELED
```

### PatientMeasurement

Representa medidas do paciente.

```txt
id
nutritionistId
patientId
weight opcional
height opcional
bmi opcional
waist opcional
hip opcional
bodyFat opcional
measuredAt
createdAt
updatedAt
```

### Document

Representa documentos do paciente.

```txt
id
nutritionistId
patientId
type
fileName
fileUrl
mimeType opcional
size opcional
createdAt
updatedAt
```

Types:

```txt
EXAM
LAB_RESULT
ANAMNESE_PDF
MEAL_PLAN
OTHER
```

## 12. Rotas do sistema

### Rotas públicas

| Rota | Descrição |
|---|---|
| / | Landing institucional simples |
| /[tenant] | Página pública da nutricionista |
| /[tenant]/pre-consulta | Formulário de pré-consulta |
| /[tenant]/pre-consulta/sucesso | Confirmação de envio |

### Rotas privadas

| Rota | Descrição |
|---|---|
| /login | Login da nutricionista |
| /dashboard/[tenant] | Dashboard privado |
| /dashboard/[tenant]/pacientes | Lista de pacientes |
| /dashboard/[tenant]/pacientes/[patientId] | Detalhe do paciente |
| /dashboard/[tenant]/anamnese/[responseId] | Detalhe da anamnese |

## 13. Fluxo do paciente

O fluxo do paciente será simples e direto.

1. Paciente acessa a página pública da nutricionista.
2. Paciente clica em Preencher pré-consulta.
3. Paciente preenche o formulário em etapas.
4. Paciente aceita o consentimento LGPD.
5. Sistema salva ou atualiza o paciente.
6. Sistema salva a anamnese.
7. Sistema gera resumo simples e pontos de atenção.
8. Paciente é redirecionado para a tela de sucesso.

## 14. Fluxo da nutricionista

1. Nutricionista acessa /login.
2. Faz login com e-mail e senha.
3. É redirecionada para /dashboard/fabiola.
4. Visualiza total de pacientes, anamneses e pré-consultas novas.
5. Acessa a lista de pacientes.
6. Abre o detalhe de um paciente.
7. Consulta idade, IMC, classificação e histórico de anamneses.
8. Abre uma anamnese específica.
9. Revisa dados de saúde, rotina, sintomas e pontos de atenção.
10. Marca a anamnese como revisada.

## 15. Formulário de pré-consulta

A rota será:

```txt
/[tenant]/pre-consulta
```

O formulário será público e não exigirá login.

### Etapas visuais

| Etapa | Conteúdo |
|---|---|
| 1 | Dados pessoais |
| 2 | Objetivo |
| 3 | Saúde e histórico |
| 4 | Rotina alimentar |
| 5 | Hábitos, sintomas e restrições |
| 6 | Consentimento e envio |

### Campos mínimos

| Campo | Obrigatoriedade |
|---|---|
| Nome | Obrigatório |
| Telefone | Obrigatório |
| E-mail | Opcional |
| Data de nascimento | Opcional |
| Peso | Opcional |
| Altura | Opcional |
| Objetivo | Obrigatório |
| Doenças ou histórico de saúde | Opcional |
| Cirurgias | Opcional |
| Medicações | Opcional |
| Histórico familiar | Opcional |
| Rotina alimentar | Opcional |
| Horários das refeições | Opcional |
| Sono | Opcional |
| Intestino | Opcional |
| Sintomas | Opcional |
| Alergias | Opcional |
| Intolerâncias | Opcional |
| Restrições alimentares | Opcional |
| Consentimento LGPD | Obrigatório |

## 16. Regras de anamnese

Ao enviar o formulário:

1. Buscar a nutricionista pelo slug.
2. Validar os dados com Zod.
3. Criar ou atualizar paciente.
4. Evitar duplicidade básica por telefone ou e-mail dentro do mesmo nutritionistId.
5. Salvar o payload completo da anamnese.
6. Gerar resumo determinístico simples.
7. Gerar pontos de atenção.
8. Redirecionar para a tela de sucesso.

### Pontos de atenção

O sistema deve gerar pontos de atenção quando identificar:

1. Alergias.
2. Intolerâncias.
3. Uso de medicações.
4. Doenças ou histórico de saúde.
5. Sintomas relevantes.
6. Sono irregular.
7. Alterações intestinais.
8. IMC elevado, quando houver peso e altura.

## 17. Cálculos

### Idade

Criar helper:

```txt
src/lib/utils/calculateAge.ts
```

A idade deve ser calculada com base na data de nascimento, considerando dia, mês e ano.

### IMC

Criar helpers:

```txt
src/lib/utils/calculateBMI.ts
src/lib/utils/classifyBMI.ts
```

Fórmula:

```txt
IMC = peso / altura²
```

A altura pode ser informada em metros ou centímetros.

Regra:

```txt
Se a altura for maior que 3, tratar como centímetros e converter para metros.
```

Classificações:

| Faixa | Classificação |
|---|---|
| Menor que 18.5 | Abaixo do peso |
| 18.5 a 24.9 | Peso normal |
| 25.0 a 29.9 | Sobrepeso |
| 30.0 a 34.9 | Obesidade grau I |
| 35.0 a 39.9 | Obesidade grau II |
| 40.0 ou mais | Obesidade grau III |

## 18. Telas esperadas

### Landing institucional

Rota:

```txt
/
```

Deve conter:

1. Nome NutriOpus.
2. Descrição curta do produto.
3. CTA para acessar tenant de exemplo.
4. Visual branco, azul e bege.

### Página pública da nutricionista

Rota:

```txt
/[tenant]
```

Deve conter:

1. Logo NutriOpus.
2. Nome da nutricionista.
3. CRN.
4. Bio.
5. Cidade e estado.
6. Especialidades em badges.
7. Card profissional.
8. Botão Preencher pré-consulta.
9. Botão Falar no WhatsApp.
10. Not found amigável se o tenant não existir.

### Login

Rota:

```txt
/login
```

Desktop:

1. Layout em duas colunas.
2. Lado esquerdo com a mensagem: Organize seus pacientes antes mesmo da consulta.
3. Lado direito com formulário de login.

Mobile:

1. Layout em uma coluna.
2. Formulário centralizado e responsivo.

### Dashboard

Rota:

```txt
/dashboard/[tenant]
```

Deve conter:

1. Total de pacientes.
2. Anamneses recebidas.
3. Pré-consultas novas.
4. Consultas da semana.
5. Últimas anamneses.
6. Pontos de atenção recentes.
7. Atalhos para pacientes e página pública.

### Lista de pacientes

Rota:

```txt
/dashboard/[tenant]/pacientes
```

Deve conter:

1. Busca por nome, telefone ou e-mail.
2. Tabela no desktop.
3. Cards no mobile.
4. Nome.
5. Telefone.
6. Objetivo.
7. Idade.
8. IMC.
9. Status.
10. Última anamnese.
11. Ação Ver.

### Detalhe do paciente

Rota:

```txt
/dashboard/[tenant]/pacientes/[patientId]
```

Deve conter:

1. Nome.
2. Telefone.
3. E-mail.
4. Idade.
5. Peso.
6. Altura.
7. IMC.
8. Classificação do IMC.
9. Objetivo.
10. Pontos de atenção.
11. Última anamnese.
12. Observações internas.
13. Histórico de anamneses.

### Visualização da anamnese

Rota:

```txt
/dashboard/[tenant]/anamnese/[responseId]
```

Deve conter:

1. Nome do paciente.
2. Data de envio.
3. Status.
4. Resumo da pré-consulta.
5. Pontos de atenção em badges.
6. Dados pessoais.
7. Histórico de saúde.
8. Rotina alimentar.
9. Hábitos.
10. Sintomas.
11. Alergias.
12. Intolerâncias.
13. Restrições.
14. Consentimento.
15. Botão Marcar como revisada.

## 19. Plano de execução por sprints

## Sprint 1: Fundação do projeto

Objetivo: criar a base técnica do NutriOpus.

Entregas:

1. Criar projeto Next.js.
2. Configurar TypeScript.
3. Configurar TailwindCSS.
4. Configurar shadcn/ui.
5. Configurar Prisma.
6. Criar docker-compose.yml com PostgreSQL.
7. Criar .env.example.
8. Criar src/lib/prisma.ts.
9. Criar README inicial.
10. Validar npm run dev.

Critérios de aceite:

1. Projeto inicia sem erro.
2. Banco sobe com Docker Compose.
3. Prisma conecta no PostgreSQL.
4. Estrutura de pastas inicial existe.

## Sprint 2: Banco, models e seed

Objetivo: modelar o domínio inicial do produto.

Entregas:

1. Criar models Prisma.
2. Criar enums.
3. Criar relacionamentos.
4. Rodar migration inicial.
5. Criar seed da nutricionista Fabíola.
6. Criar seed do usuário de login.
7. Validar Prisma Studio.

Critérios de aceite:

1. Schema Prisma válido.
2. Migration executa sem erro.
3. Seed cria dados iniciais.
4. /fabiola poderá carregar dados reais do banco.

## Sprint 3: Identidade visual e rotas públicas

Objetivo: criar a experiência pública do NutriOpus.

Entregas:

1. Criar landing institucional.
2. Criar página pública /[tenant].
3. Criar componentes PublicHero e NutritionistCard.
4. Aplicar paleta branco, azul e bege.
5. Criar not found amigável para tenant inexistente.
6. Criar botão para pré-consulta.
7. Criar link de WhatsApp.

Critérios de aceite:

1. / carrega corretamente.
2. /fabiola carrega dados do banco.
3. A UI segue a identidade visual.
4. A página funciona bem no mobile.

## Sprint 4: Pré-consulta digital

Objetivo: permitir que o paciente envie a anamnese.

Entregas:

1. Criar schema Zod da anamnese.
2. Criar PreConsultationForm.
3. Criar etapas visuais do formulário.
4. Integrar React Hook Form.
5. Criar server action de envio.
6. Criar ou atualizar paciente por telefone ou e-mail.
7. Salvar AnamneseResponse.
8. Gerar summary.
9. Gerar attentionPoints.
10. Criar tela de sucesso.

Critérios de aceite:

1. /fabiola/pre-consulta abre sem login.
2. Validação impede envio inválido.
3. Consentimento LGPD é obrigatório.
4. Envio cria paciente e anamnese no banco.
5. Usuário é redirecionado para /fabiola/pre-consulta/sucesso.

## Sprint 5: Autenticação e sessão

Objetivo: proteger o dashboard.

Entregas:

1. Criar schema de login.
2. Criar auth.service.ts.
3. Criar password.ts.
4. Criar session.ts com jose.
5. Criar cookie httpOnly.
6. Criar login.
7. Criar logout.
8. Proteger rotas /dashboard.
9. Redirecionar após login para /dashboard/[tenant].

Critérios de aceite:

1. Login funciona com fabiola@nutriopus.com e senha 123456.
2. Rotas privadas não abrem sem sessão.
3. Logout remove sessão.
4. Usuário não acessa tenant que não pertence a ele.

## Sprint 6: Dashboard

Objetivo: criar a primeira visão privada da nutricionista.

Entregas:

1. Criar layout privado.
2. Criar DashboardSidebar.
3. Criar DashboardHeader.
4. Criar MobileBottomNav.
5. Criar cards de estatísticas.
6. Criar service de dashboard.
7. Listar últimas anamneses.
8. Exibir pontos de atenção recentes.
9. Criar atalhos principais.

Critérios de aceite:

1. /dashboard/fabiola é protegido.
2. Cards mostram dados reais.
3. Últimas anamneses aparecem.
4. Layout funciona no desktop e mobile.

## Sprint 7: Pacientes

Objetivo: permitir consulta dos pacientes cadastrados.

Entregas:

1. Criar service de pacientes.
2. Criar listagem de pacientes.
3. Criar busca por nome, telefone ou e-mail.
4. Criar tabela desktop.
5. Criar cards mobile.
6. Calcular idade.
7. Calcular IMC.
8. Criar página de detalhe do paciente.
9. Exibir histórico de anamneses.

Critérios de aceite:

1. Pacientes criados pela pré-consulta aparecem na lista.
2. Busca funciona.
3. Detalhe do paciente valida tenant.
4. Idade, IMC e classificação aparecem quando houver dados.

## Sprint 8: Visualização e revisão da anamnese

Objetivo: permitir que a nutricionista analise uma pré-consulta.

Entregas:

1. Criar página de detalhe da anamnese.
2. Exibir payload de forma legível.
3. Exibir resumo.
4. Exibir pontos de atenção.
5. Agrupar dados por seções.
6. Criar ação Marcar como revisada.
7. Atualizar status para REVIEWED.

Critérios de aceite:

1. A tela mostra todos os dados relevantes da anamnese.
2. O payload não aparece desorganizado.
3. A ação de revisar atualiza o status.
4. A consulta respeita nutritionistId.

## Sprint 9: Polimento e estabilidade

Objetivo: preparar a entrega final do MVP.

Entregas:

1. Revisar responsividade.
2. Revisar mensagens de erro.
3. Revisar loading states.
4. Revisar empty states.
5. Revisar código duplicado.
6. Garantir que regras de negócio estejam em services.
7. Rodar lint.
8. Rodar build.
9. Atualizar README.
10. Validar fluxo ponta a ponta.

Critérios de aceite:

1. npm run lint passa.
2. npm run build passa.
3. Fluxo público funciona.
4. Fluxo privado funciona.
5. Banco persiste os dados.
6. UI segue o tema definido.

## 20. Critérios gerais de aceite

O MVP será considerado funcional quando:

1. O projeto instalar dependências sem erro.
2. O app rodar com npm run dev.
3. O Prisma schema estiver válido.
4. O seed criar a nutricionista Fabíola e o usuário de login.
5. A landing /fabiola carregar dados reais do banco.
6. A pré-consulta /fabiola/pre-consulta salvar paciente e anamnese no banco.
7. Após envio, o usuário cair em /fabiola/pre-consulta/sucesso.
8. O login funcionar com fabiola@nutriopus.com e senha 123456.
9. O dashboard /dashboard/fabiola for protegido por sessão.
10. A listagem de pacientes mostrar pacientes criados via pré-consulta.
11. O detalhe do paciente mostrar idade, IMC e classificação quando houver dados.
12. A tela de anamnese mostrar resumo, pontos de atenção e payload de forma legível.
13. A UI seguir o tema branco, azul e bege.
14. O código estar organizado em services, validation, lib e components.
15. Nenhuma consulta privada buscar dados sem nutritionistId.
16. O sistema não usar mocks como substituto do banco nas features principais.

## 21. Comandos principais

### Criar projeto

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Se a pasta não permitir por causa do .git:

```bash
npx create-next-app@latest nutriopus-temp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Depois copiar os arquivos para a raiz sem sobrescrever .git e apagar a pasta temporária.

### Instalar dependências esperadas

```bash
npm install
```

### Subir banco

```bash
docker compose up -d
```

### Rodar migration

```bash
npx prisma migrate dev --name init
```

### Gerar Prisma Client

```bash
npm run prisma:generate
```

### Rodar seed

```bash
npm run prisma:seed
```

### Iniciar aplicação

```bash
npm run dev
```

## 22. Scripts esperados no package.json

| Script | Função |
|---|---|
| dev | Rodar em desenvolvimento |
| build | Gerar build de produção |
| start | Rodar build de produção |
| lint | Verificar código |
| prisma:generate | Gerar Prisma Client |
| prisma:migrate | Rodar migrations |
| prisma:seed | Popular banco |
| prisma:studio | Abrir Prisma Studio |

## 23. Riscos técnicos e cuidados

| Risco | Mitigação |
|---|---|
| Vazamento de dados entre tenants | Sempre filtrar por nutritionistId |
| Regra de negócio espalhada em páginas | Concentrar lógica em services |
| Formulário grande e confuso | Dividir em etapas visuais |
| UI genérica demais | Aplicar paleta bege, branco e azul desde o início |
| Erro de autenticação em rotas privadas | Validar sessão server-side |
| Duplicidade de pacientes | Checar telefone ou e-mail dentro do tenant |
| Prisma desalinhado com banco | Usar migrations e evitar SQL manual |
| Tabelas ruins no mobile | Converter para cards responsivos |

## 24. Visão de evolução

Após o MVP, o NutriOpus pode evoluir para uma plataforma clínica mais completa.

### Próximas features

1. Cadastro público de nutricionistas.
2. Upload de foto de perfil.
3. Agenda de consultas.
4. Histórico de medidas corporais.
5. Upload de exames e documentos.
6. Exportação de anamnese em PDF.
7. Plano alimentar.
8. Modelos de questionários por especialidade.
9. Temas personalizáveis por nutricionista.
10. Notificações por e-mail.
11. Área do paciente.
12. App mobile com React Native.
13. Relatórios de evolução.
14. Controle financeiro da nutricionista.
15. Assinaturas e plano SaaS.

## 25. Definição final do projeto

O NutriOpus deve nascer como um SaaS enxuto, mas com estrutura profissional desde a primeira versão.

A prioridade não é criar muitas funcionalidades superficiais. A prioridade é entregar um fluxo essencial funcionando bem:

```txt
Paciente acessa página pública
Paciente preenche pré-consulta
Sistema salva os dados
Nutricionista faz login
Nutricionista visualiza paciente, anamnese, resumo e pontos de atenção
```

Esse fluxo valida o núcleo do produto e cria uma base sólida para evoluir o NutriOpus para agenda, documentos, planos alimentares, app mobile e cobrança recorrente.
