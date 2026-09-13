# Fotos de Evolucao do Paciente

## Estado atual
Ainda nao existe model dedicado para fotos evolutivas. Arquivos de imagem podem ser tratados pelo modulo geral de documentos, mas sem timeline especifica por avaliacao.

## Fase futura
Criar `PatientProgressPhoto` com `nutritionistId`, `patientId`, `measurementId`, tipo da foto, data, observacoes e `visibleToPatient`.

## Seguranca
Fotos devem ser privadas por padrao e sempre filtradas por tenant e paciente.
