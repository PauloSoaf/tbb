# Anamnese, Antropometria e Atendimento - 2026-07-07

## Resumo

Evolucao incremental do fluxo clinico do paciente mantendo a estrutura atual do NutriOpus. O foco foi dar acesso mais claro a prontuario, anamneses e antropometria, completar o CRUD operacional de anamnese e adicionar uma lateral clinica leve no atendimento.

## Rotas alteradas

- `/dashboard/[tenant]/pacientes/[patientId]`
- `/dashboard/[tenant]/pacientes/[patientId]/anamnese`
- `/dashboard/[tenant]/pacientes/[patientId]/anamnese/nova`
- `/dashboard/[tenant]/anamnese/[responseId]`
- `/dashboard/[tenant]/anamnese/[responseId]/editar`
- `/dashboard/[tenant]/atendimentos/[sessionId]`
- `/dashboard/[tenant]/pacientes`

## Componentes criados ou modificados

- Criado `src/components/anamnese/AnamneseDeleteButton.tsx`
- Criado `src/components/care-session/CareSessionClinicalTabs.tsx`
- Reaproveitado `InternalAnamneseForm` para criar e editar anamnese
- Atualizado `AnamneseDetailPageClient` para mostrar perguntas sem resposta
- Atualizados `PatientTable` e `PatientMobileCard` para abrir a rota real de anamneses
- Atualizada a tela de paciente com cards compactos de Prontuario, Anamneses e Antropometria
- Atualizada a sala de atendimento para exibir abas clinicas na coluna direita

## Actions e services

- `createAnamneseForPatient`
- `updateAnamnese`
- `deleteAnamnese`
- `updateInternalAnamneseAction`
- `deleteInternalAnamneseAction`

As actions validam o tenant pelo padrao existente (`assertTenantAccess`) e as queries usam `nutritionistId`.

## Prisma

Nao houve alteracao de schema nem migration. A implementacao reaproveita `AnamneseResponse.payload` como estrutura atual das respostas.

## Referencias consultadas

- HL7 FHIR `Questionnaire`: organiza perguntas em grupos e subgrupos, reforcando a decisao de preservar a ordem e as secoes da anamnese.
  https://hl7.org/fhir/questionnaire.html
- HL7 FHIR `QuestionnaireResponse`: representa respostas completas ou parciais de questionarios, alinhado ao requisito de mostrar tambem perguntas sem resposta.
  https://hl7.org/fhir/questionnaireresponse.html
- HL7 FHIR Vital Signs `Observation`: inclui altura, peso e IMC como sinais vitais/observacoes clinicas, usado como referencia para manter antropometria no fluxo clinico sem criar modelagem paralela.
  https://build.fhir.org/observation-vitalsigns.html
- Medplum, projeto open source em GitHub, documenta questionarios para pacientes e profissionais como caso comum em apps clinicos; isso reforcou o fluxo misto em que paciente ou nutricionista podem preencher a anamnese.
  https://github.com/medplum/medplum/blob/main/packages/docs/docs/questionnaires/index.md

## i18n

Chaves adicionadas ou restauradas:

- `confirm_dialog.close_overlay`
- `confirmations.delete_anamnese`
- `anamnese.edit`
- `anamnese.delete`
- `anamnese.deleted_success`
- `anamnese.delete_error`
- `anamnese.no_answer`
- `care_session.clinical_tabs.*`

## Como testar manualmente

1. Abrir `/dashboard/[tenant]/pacientes`.
2. Clicar em `Anamneses` em um paciente e confirmar que abre `/pacientes/[patientId]/anamnese`.
3. Criar uma nova anamnese.
4. Abrir o detalhe da anamnese e verificar perguntas respondidas e sem resposta.
5. Editar a anamnese em `/dashboard/[tenant]/anamnese/[responseId]/editar`.
6. Excluir uma anamnese e confirmar que aparece modal tematico, nao `confirm()` nativo.
7. Abrir a tela do paciente e verificar os cards de Prontuario, Anamneses e Antropometria no topo do corpo.
8. Abrir um atendimento e validar as abas Prontuario, Anamnese e Antropometria na coluna direita.
9. Salvar notas do atendimento pela aba Prontuario.

## Pontos de atencao

- Para preservar a estrutura atual, as abas de Anamnese e Antropometria no atendimento usam atalhos contextuais para as rotas existentes de historico/criacao, enquanto Prontuario salva inline.
- A anamnese continua baseada no `payload Json` atual. Uma modelagem normalizada de perguntas/respostas pode ser avaliada futuramente, mas nao foi criada aqui para evitar migration e risco de dados.

## Validacao

- `npx tsc --noEmit --pretty false`
- `npx eslint` nos arquivos alterados
- Parse dos JSONs de i18n (`pt`, `en`, `es`)
- `npm test` (`67` arquivos, `663` testes)
- `npx next build`
- `git diff --check`

Observacao: `npm run build` falhou antes do build do Next em `prisma generate` com `EPERM` ao renomear `node_modules/.prisma/client/query_engine-windows.dll.node`, com processos `node.exe` ativos no Windows. Para separar lock de ambiente de erro de codigo, `npx next build` foi executado em seguida e compilou com sucesso.
