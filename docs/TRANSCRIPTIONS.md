# Transcrições de Atendimentos — NutriOpus

## Objetivo

Permitir que nutricionistas registrem, armazenem, revisem e aprovem transcrições de consultas e atendimentos, com controle de visibilidade para o paciente, suporte a múltiplos providers de transcrição e conformidade com a LGPD.

## Fluxo da nutricionista

1. Abrir um atendimento (`/dashboard/[tenant]/atendimentos/[sessionId]`)
2. Clicar em "Adicionar transcrição manual" ou enviar áudio
3. (Opcional) Confirmar consentimento do paciente
4. Para transcrição manual: digitar o texto e salvar
5. Para áudio + provider automático: enviar arquivo → processar → aguardar resultado
6. Revisar transcrição gerada, editar se necessário
7. Adicionar resumo clínico e resumo para o paciente
8. Aprovar transcrição
9. (Opcional) Liberar para o paciente via "Liberar para paciente"

## Fluxo do paciente

1. Acessar portal em `/portal/[tenant]/consultas`
2. Ver apenas transcrições com `visibility = PATIENT_VISIBLE`
3. Leitura apenas — não pode editar, aprovar ou excluir

## Models

### ConsultationTranscription

Campo principal de uma transcrição vinculada a um atendimento ou consulta.

Campos principais:
- `nutritionistId` — isolamento multi-tenant
- `patientId` — paciente relacionado
- `careSessionId` — atendimento (opcional)
- `appointmentId` — consulta (opcional)
- `provider` — qual provider gerou a transcrição
- `status` — ciclo de vida da transcrição
- `visibility` — `NUTRITIONIST_ONLY` ou `PATIENT_VISIBLE`
- `rawTranscript` — texto gerado automaticamente
- `editedTranscript` — texto revisado pela nutricionista
- `clinicalSummary` — resumo clínico (SOAP, evolução, etc.)
- `patientFriendlySummary` — resumo amigável para o paciente
- `audioUrl` — URL do áudio se enviado
- `consentForRecording` / `consentForTranscription` — consentimento registrado

### ConsultationTranscriptionSegment

Segmentos da transcrição com timestamps e speaker labels.

Campos: `transcriptionId`, `speakerLabel`, `speakerRole`, `startSeconds`, `endSeconds`, `text`, `confidence`, `position`.

## Providers

### MANUAL
Nutricionista digita ou cola o texto. Não requer configuração. Provider padrão.

### CUSTOM_HTTP
Envia o áudio para um endpoint HTTP externo (microserviço Python/FastAPI).
```env
CUSTOM_TRANSCRIPTION_HTTP_URL=http://localhost:8001/transcribe
CUSTOM_TRANSCRIPTION_HTTP_TOKEN=secret (opcional)
```

**Recomendado para Whisper local**: rode `faster-whisper` ou `whisper.cpp` via FastAPI e aponte para este endpoint.

### LOCAL_WHISPER
Preparado para execução via binário local. **Não recomendado rodar dentro do Next.js** — prefira CUSTOM_HTTP.

### OPENAI_WHISPER_API
Requer `OPENAI_API_KEY`. Envia áudio para a API da OpenAI.

### ELEVENLABS / NOTTA_EXTERNAL
Providers pagos opcionais. Não configurados por padrão.

## Upload de áudio

- Tipos permitidos: audio/mpeg, audio/mp4, audio/wav, audio/webm, audio/ogg, video/webm, video/mp4
- Tamanho máximo: configurável via `TRANSCRIPTION_MAX_AUDIO_SIZE_MB` (padrão 100MB)
- Storage: reutiliza `storage.uploadFile` com pasta `transcriptions/{nutritionistId}/{patientId}`
- Não expõe URL pública sem validação de acesso

## Transcrição manual

Não requer provider configurado. A nutricionista digita o texto diretamente no campo `rawTranscript` ou `editedTranscript`.

## Transcrição automática

1. Enviar áudio → status `UPLOADED`
2. Chamar `startTranscriptionProcessingAction` → status `PROCESSING`
3. Provider processa → status `COMPLETED` ou `FAILED`
4. Nutricionista revisa → status `REVIEWED`
5. Nutricionista aprova → status `APPROVED`

## Revisão e aprovação

Transcrição automática nunca é considerada registro clínico final sem revisão.

Aviso obrigatório: **"A transcrição automática pode conter erros. Revise antes de usar como registro clínico."**

## Resumo clínico

Prompt para geração (via AI provider):
- Queixas principais, evolução, adesão ao plano, dificuldades, orientações, próximos passos, pendências
- Nunca inventa informações além da transcrição
- Não substitui a nutricionista

## Histórico no prontuário

Componente `PatientTranscriptionHistory` no prontuário do paciente:
- Lista todas as transcrições
- Busca por palavra-chave (rawTranscript, editedTranscript, clinicalSummary)
- Filtro por status
- Drawer de detalhes ao clicar

## Histórico de consultas

No detalhe do atendimento (`CareSessionPageClient`), aba "Transcrição" com `TranscriptionPanel`.

## Segurança

- Todo acesso valida `nutritionistId` vindo da sessão
- Nunca confia em `nutritionistId` vindo do client
- Paciente só vê `visibility = PATIENT_VISIBLE`
- Áudio armazenado com path incluindo `nutritionistId/patientId`
- Consentimento registrado com timestamp

## LGPD

Ver [TRANSCRIPTION_PRIVACY_AND_LGPD.md](./TRANSCRIPTION_PRIVACY_AND_LGPD.md).

## i18n

Chaves no namespace `transcriptions.*`. Suportado em PT, EN e ES.

## Testes

- `src/validation/transcription.schema.test.ts` — schemas Zod
- `src/services/transcription/transcription-provider-registry.test.ts` — registry de providers

## Limitações

- Gravação em tempo real no navegador não está implementada no MVP (phase 2)
- LOCAL_WHISPER requer configuração externa (binário) — use CUSTOM_HTTP para Whisper local
- Providers externos (OpenAI, ElevenLabs) requerem API keys pagas
- Separação automática de falantes (diarization) depende do provider
- Busca semântica não implementada (MVP usa `contains`)

## Próximas evoluções

1. Microserviço Python com faster-whisper
2. whisper.cpp local via Docker
3. Transcrição em tempo real (WebSocket)
4. Separação automática de falantes
5. Resumo clínico automático via AI local
6. Extração automática de tarefas e orientações
7. Busca semântica / embeddings
8. Geração de evolução SOAP automática
9. Transcrição de Google Meet
10. Exportação PDF da transcrição
11. Assinatura digital do paciente
12. Política de retenção e exclusão de áudio
