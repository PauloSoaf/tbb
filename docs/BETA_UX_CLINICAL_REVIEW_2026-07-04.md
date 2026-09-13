# Revisao UX Clinica Beta

Data: 2026-07-04
Agente: Codex
Status: Implementado

## Problema

A tela do paciente misturava prontuario, notas e acoes clinicas de forma pouco explicita. Avaliacoes e relatorios nao ficavam suficientemente visiveis no topo.

## Causa encontrada

O fluxo ja tinha uma sidebar rica e timeline central, mas os labels ainda chamavam a area de "Linha do Tempo Clinica" e o campo de nota rapida nao explicava que a anotacao entraria no prontuario.

## Correcao aplicada

O centro da tela passou a ser rotulado como `Prontuario clinico`, a nota rapida ganhou titulo e explicacao propria, e o header sticky recebeu atalhos diretos para Avaliacoes e Relatorio. O breadcrumb agora usa Dashboard.

## Arquivos alterados

- `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx`
- `src/components/patients/timeline/QuickNoteInput.tsx`
- `src/components/patients/timeline/PatientStickyHeader.tsx`

## Testes executados

- `npx tsc --noEmit --pretty false`
- `npm run test`
- `npm run build`

## Resultado

O prontuario fica mais central e as acoes clinicas de avaliacao, plano, atendimento e relatorio ficam mais acessiveis.

## Pendencias

Substituir mais `title` nativos antigos por `AppTooltip` em telas secundarias pode melhorar a consistencia visual.
