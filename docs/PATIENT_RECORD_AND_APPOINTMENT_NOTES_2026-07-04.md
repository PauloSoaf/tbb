# Patient Record And Appointment Notes

Data: 2026-07-04
Agente: Codex
Status: Implementado

## Problema

Anotacoes de consultas e atendimentos precisavam aparecer no prontuario, e o peso manual precisava ser rapido de registrar.

## Causa encontrada

`Appointment.notes` ja existia, mas a timeline mostrava somente a modalidade. `CareSession` tambem tinha campos de nota/resumo, mas a timeline priorizava apenas o titulo. O peso manual estava possivel no formulario completo, porem escondido em um fluxo maior.

## Correcao aplicada

A timeline agora inclui notas de consulta e resumo/notas de atendimentos online. Atualizar notas de consulta invalida tambem o paciente especifico. Foi adicionado schema/action/form para registro rapido de peso manual em Avaliacoes/Medidas.

## Arquivos alterados

- `src/services/patient-timeline.service.ts`
- `src/actions/appointment.action.ts`
- `src/validation/manual-measurement.schema.ts`
- `src/components/anthropometry/ManualWeightQuickForm.tsx`
- `src/app/dashboard/[tenant]/pacientes/[patientId]/medidas/actions.ts`
- `src/app/dashboard/[tenant]/pacientes/[patientId]/medidas/page.tsx`

## Testes executados

- `npx vitest run src/validation/__tests__/manual-measurement.schema.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run test`
- `npm run build`

## Resultado

Notas de atendimento entram no fluxo do prontuario e o peso manual pode ser salvo sem abrir avaliacao completa.

## Pendencias

Adicionar formulario rapido para circunferencias manuais se a nutricionista quiser registrar medidas isoladas com a mesma velocidade do peso.
