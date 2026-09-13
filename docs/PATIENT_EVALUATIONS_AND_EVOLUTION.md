# Avaliacoes e Evolucao do Paciente

## Objetivo
Centralizar o acompanhamento antropometrico do paciente com historico, graficos, nova avaliacao e caminhos de compatibilidade.

## Problema resolvido
O botao Avaliacoes da lista de pacientes apontava para uma URL com slug do paciente, mas as telas de medidas buscavam apenas o id bruto. Isso fazia `/dashboard/[tenant]/pacientes/[patientSlug]/medidas` cair em 404.

## Rotas
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes`
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes/nova`
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes/[measurementId]`
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes/[measurementId]/editar`
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes/adipometro`
- `/dashboard/[tenant]/pacientes/[patientSlug]/avaliacoes/relatorio`
- Compatibilidade mantida em `/medidas`.

## Models
O modulo reaproveita `PatientMeasurement`. Nao foi criado model duplicado de avaliacao.

## Services
`patient-route.service.ts` resolve slug ou id bruto com validacao por `nutritionistId`. `patient-measurement.service.ts` valida `nutritionistId` e `patientId` nas operacoes sensiveis.

## Actions
As actions de medidas salvam usando o id real do paciente e redirecionam para a rota clara `/avaliacoes`.

## Tela de avaliacoes
A tela atual mostra resumo, grafico de evolucao, historico desktop/mobile e atalhos para nova avaliacao e adipometro.

## Nova avaliacao
Usa `AnthropometryForm` e calcula IMC, classificacao, RCQ, massa gorda e massa magra.

## Graficos
O grafico atual usa `AnthropometryEvolutionChart` com peso, IMC, gordura corporal e massa magra.

## Fotos
Ainda nao ha model dedicado de fotos evolutivas. Fase futura: `PatientProgressPhoto` com visibilidade para paciente.

## Arquivos
O projeto ja possui `Document` para arquivos do paciente. Fase futura: integrar anexos diretamente na tela de avaliacoes.

## Integracao com atendimento
Nao alterado nesta entrega para evitar conflito com a sprint ativa de atendimento/care-session. Fase futura: painel lateral de contexto do paciente.

## Relatorio PDF
`/avaliacoes/relatorio` redireciona para o relatorio de evolucao existente do paciente. PDF nativo customizavel fica como fase futura.

## Seguranca
As consultas resolvem paciente por tenant/nutricionista e validam que a avaliacao pertence ao paciente da rota.

## i18n
Esta entrega priorizou a correcao funcional da rota e preservou a UI existente. Proxima fase: mover textos remanescentes de antropometria para `evaluations.*` em PT/EN/ES.

## Testes
Foi adicionado teste para garantir que helpers de rota apontem para `/avaliacoes`.

## Limitacoes
- Fotos evolutivas dedicadas ainda nao implementadas.
- Upload de anexos dentro da tela de avaliacoes ainda nao implementado.
- PDF nativo ainda nao implementado.
- Atendimento nao foi alterado nesta etapa.

## Proximas evolucoes
Fotos antes/depois, anexos por avaliacao, PDF customizavel, painel no atendimento, i18n completo da antropometria e testes de servico com banco.
