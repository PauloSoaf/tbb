# Arquivos e Anexos do Paciente

## Estado atual
O projeto possui `Document` para arquivos do paciente e rota de arquivos no prontuario.

## Integracao planejada
A tela de avaliacoes deve listar exames, imagens, relatorios e documentos vinculados ao paciente, com controle de visibilidade para o portal.

## Regra de seguranca
Toda leitura e escrita deve validar `nutritionistId` e `patientId`; arquivos privados nao devem aparecer para o paciente.
