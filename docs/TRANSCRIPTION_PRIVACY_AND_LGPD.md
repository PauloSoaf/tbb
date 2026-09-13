# Transcrições — Privacidade e LGPD

## Dados coletados

| Dado | Finalidade | Base legal (LGPD) |
|------|-----------|-------------------|
| Áudio de atendimento | Transcrição automática | Consentimento explícito |
| Transcrição do atendimento | Registro clínico | Tutela da saúde (Art. 7, VIII) |
| Resumo clínico | Prontuário do paciente | Tutela da saúde |
| Speaker labels | Identificação de falantes | Consentimento explícito |

## Consentimento

Antes de qualquer gravação ou processamento automático:

1. A nutricionista confirma que o paciente autorizou `consentForRecording`
2. A nutricionista confirma que o paciente autorizou `consentForTranscription`
3. Ambos os campos são registrados com `consentCollectedAt` na base de dados
4. Sem consentimento, o sistema não processa automaticamente

## Isolamento de dados

- Todo dado é isolado por `nutritionistId` — nutricionista A nunca acessa dados de B
- Todo áudio é armazenado em `transcriptions/{nutritionistId}/{patientId}/`
- Paciente só acessa dados do próprio prontuário
- Transcrições são `NUTRITIONIST_ONLY` por padrão

## Visibilidade do paciente

- Padrão: `NUTRITIONIST_ONLY` — paciente não vê nada
- Para liberar: nutricionista muda para `PATIENT_VISIBLE`
- No portal, filtramos sempre por `visibility = PATIENT_VISIBLE AND patientId = session.patientId`

## Providers externos e dados em trânsito

| Provider | Dado enviado | Requer consentimento |
|----------|-------------|---------------------|
| MANUAL | Nenhum | Não |
| LOCAL_WHISPER | Processado localmente | Não (local) |
| CUSTOM_HTTP | Áudio para endpoint configurado | Sim |
| OPENAI_WHISPER_API | Áudio para OpenAI | Sim + aviso explícito |
| ELEVENLABS | Áudio para ElevenLabs | Sim + aviso explícito |

**Regra**: dado nunca vai para provider externo sem consentimento explícito registrado.

## Retenção e exclusão

- Nutricionista pode excluir a transcrição (inclui áudio do storage)
- `deleteTranscription` remove: registro, segmentos e arquivo de áudio
- Futuro: política de retenção automática (30/60/90 dias para áudio)

## Segurança técnica

- `nutritionistId` nunca vem do cliente — sempre da sessão autenticada
- `patientId` validado contra `nutritionistId` antes de qualquer operação
- Áudio não exposto por URL pública sem validação de autoria
- `audioStorageKey` separado de `audioUrl` para permitir revogação
- Nenhuma API key no client (apenas server-side)

## Incidentes

Em caso de vazamento de dados de atendimento:
1. Revogar acesso ao storage
2. Notificar ANPD dentro de 72h se dados pessoais sensíveis
3. Notificar pacientes afetados
4. Registrar incidente no log de segurança

## Referências

- Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)
- Resolução CFN nº 693/2019 — prontuário nutricional
- CFM — normas de telemedicina e gravação
