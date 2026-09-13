# Módulo de Antropometria — NutriOpus

## Objetivo
Fornecer um módulo clínico para que o nutricionista registre, acompanhe e visualize a evolução das medidas corporais e da composição corporal dos pacientes.

## Rotas
- `/dashboard/[tenant]/pacientes/[patientId]/medidas` - Histórico de avaliações e gráficos de evolução.
- `/dashboard/[tenant]/pacientes/[patientId]/medidas/nova` - Formulário para nova avaliação.
- `/dashboard/[tenant]/pacientes/[patientId]/medidas/[measurementId]` - Visualização detalhada de uma avaliação.
- `/dashboard/[tenant]/pacientes/[patientId]/medidas/[measurementId]/editar` - Edição de uma avaliação existente.

## Modelo de Dados
O modelo `PatientMeasurement` (tabela `patient_measurements`) armazena:
- Medidas principais: peso e altura.
- Circunferências: cintura, quadril, pescoço, tórax, abdômen, braços, antebraços, coxas e panturrilhas.
- Composição corporal: percentual de gordura.
- Campos calculados: `bmi` (IMC), `bmiClassification`, `waistHipRatio` (Relação Cintura/Quadril), `bodyFatKg` (Gordura em kg), `leanMassKg` (Massa Magra em kg).
- Metadados: origem da medição (`source` enum) e observações (`notes`).

*Nota de versão: O campo `bodyFat` foi descontinuado em favor de `bodyFatPercentage` para maior clareza semântica, embora permaneça no banco por retrocompatibilidade temporária.*

## Regras de Negócio e Segurança
- **Multi-tenancy Rigoroso**: Todas as consultas e gravações exigem o `nutritionistId` vindo do cookie de sessão.
- Isolamento: Não é possível acessar ou modificar medições de um paciente que não pertença ao tenant ativo.
- Cálculos Automáticos: O sistema calcula automaticamente IMC, classificação, relação cintura/quadril, massa gorda (kg) e massa magra (kg) sempre que os campos necessários são fornecidos.
- Validação: As validações no cliente e servidor usam Zod, exigindo que os valores numéricos sejam positivos e lógicos (ex: % de gordura entre 0 e 100).

## Cálculos Implementados
- **IMC (Índice de Massa Corporal)** = peso (kg) / altura² (m)
- **RCQ (Relação Cintura/Quadril)** = cintura / quadril
- **Massa Gorda (kg)** = peso (kg) * (percentual de gordura / 100)
- **Massa Magra (kg)** = peso (kg) - massa gorda (kg)

## Limitações da Versão Atual
- A estimativa do percentual de gordura baseada em dobras cutâneas (protocolos como Pollock, Petroski, etc.) não é calculada automaticamente. O nutricionista deve inserir o valor final do percentual.
- Upload de fotos de evolução do paciente não suportado.
- Exportação de relatório evolutivo em PDF não suportado.

## Próximos Passos Futuros
1. Inclusão de calculadora de protocolos de dobras cutâneas (Pollock 3/7, Petroski, Durnin).
2. Upload e comparação lado a lado de fotos da evolução física do paciente.
3. Geração de PDF do relatório antropométrico para entrega ao paciente.
