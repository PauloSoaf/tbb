# Sprint Avaliacoes e Evolucao do Paciente

## Problema
O botao Avaliacoes da lista de pacientes podia abrir `/medidas` com slug do paciente e cair em 404.

## Implementado
- Resolucao de slug ou id bruto nas paginas de medidas.
- Nova rota clara `/avaliacoes`.
- Compatibilidade mantida em `/medidas`.
- Links principais atualizados para `/avaliacoes`.
- Validacao de pertencimento da avaliacao ao paciente da rota.
- Teste dos helpers de rota.

## Resultado esperado
O botao Avaliacoes abre uma rota valida e a tela existente de antropometria aparece para pacientes acessados por slug.

## Limitacoes
Fotos dedicadas, anexos integrados, PDF nativo e painel dentro de atendimento ficam para a proxima fase.
