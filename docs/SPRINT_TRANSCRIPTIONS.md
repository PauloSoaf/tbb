# Sprint Transcrição de Atendimentos

## Resumo

Sprint de implementação do módulo de transcrição de atendimentos e consultas no NutriOpus.

## Escopo implementado

### Models Prisma
- `ConsultationTranscription` — modelo principal com campos para transcrição bruta, editada, resumo clínico, consentimento, provider, status
- `ConsultationTranscriptionSegment` — segmentos de transcrição com timestamps e falantes
- Enums: `TranscriptionProvider`, `TranscriptionStatus`, `TranscriptionSourceType`, `TranscriptionVisibility`

### Migration
- Schema sincronizado via `prisma db push`
- Relações adicionadas em `Nutritionist` e `Patient`

### Providers implementados
- **MANUAL** — funcional, sem API
- **CUSTOM_HTTP** — preparado para microserviço Python/FastAPI
- **LOCAL_WHISPER** — documentado, delega para CUSTOM_HTTP
- **OPENAI_WHISPER_API** — preparado (requer API key)
- **ELEVENLABS** — preparado (requer API key)

### Serviços
- `transcription.types.ts` — tipos e interface do provider
- `manual-transcription.provider.ts`
- `custom-http-transcription.provider.ts`
- `local-whisper.provider.ts`
- `openai-whisper.provider.ts`
- `transcription-provider-registry.ts`
- `transcription-storage.service.ts`
- `transcription.service.ts` — CRUD completo

### Actions
- `transcription.action.ts` — todas as actions com validação Zod e tenant access

### Validação Zod
- `transcription.schema.ts` — schemas para todos os cenários
- `transcription.schema.test.ts` — testes unitários

### UI — Atendimento
- `TranscriptionPanel.tsx` — painel principal integrado ao CareSessionRoom
- `TranscriptionStatusBadge.tsx` — badge de status
- `TranscriptionEditor.tsx` — editor de texto
- `TranscriptionSegmentsList.tsx` — lista de segmentos
- `TranscriptionActions.tsx` — ações (aprovar, rejeitar, excluir, etc.)
- `TranscriptionUploadDropzone.tsx` — upload de áudio
- `TranscriptionConsentBanner.tsx` — banner de consentimento

### UI — Prontuário
- `PatientTranscriptionHistory.tsx` — histórico no prontuário
- `PatientTranscriptionCard.tsx` — card de transcrição
- `PatientTranscriptionDetailDrawer.tsx` — drawer de detalhe

### i18n
- Chaves completas em PT, EN e ES no namespace `transcriptions.*`

### Documentação
- `docs/TRANSCRIPTIONS.md`
- `docs/TRANSCRIPTION_PROVIDERS.md`
- `docs/TRANSCRIPTION_PRIVACY_AND_LGPD.md`

### Variáveis de ambiente
- `.env.example` atualizado com todas as variáveis

## Limitações
- Gravação no navegador (MediaRecorder) não implementada nesta sprint
- Transcrição em tempo real não implementada
- Resumo clínico por IA depende de provider externo
- Busca semântica futura

## Próximos passos
1. Microserviço Python com faster-whisper
2. Transcrição em tempo real
3. Separação automática de falantes
4. Busca semântica
5. Exportação PDF
