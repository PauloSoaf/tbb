# Providers de Transcrição — NutriOpus

## Arquitetura

Todos os providers implementam a interface `TranscriptionProviderClient`:

```ts
interface TranscriptionProviderClient {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>
}
```

O `transcription-provider-registry.ts` seleciona o provider com base em `TRANSCRIPTION_PROVIDER` e verifica se as variáveis de ambiente necessárias estão configuradas.

## MANUAL (padrão)

Não realiza processamento automático. A nutricionista digita o texto manualmente.

```env
TRANSCRIPTION_PROVIDER=MANUAL
```

Funciona sem qualquer configuração adicional.

## CUSTOM_HTTP — Whisper local via microserviço

**Recomendado para Whisper local.**

O NutriOpus envia o áudio para um endpoint HTTP configurável. Você pode rodar `faster-whisper`, `whisper.cpp` ou qualquer modelo local via FastAPI/Flask.

```env
TRANSCRIPTION_PROVIDER=CUSTOM_HTTP
CUSTOM_TRANSCRIPTION_HTTP_URL=http://localhost:8001/transcribe
CUSTOM_TRANSCRIPTION_HTTP_TOKEN=meu-token-secreto  # opcional
```

### Protocolo esperado

**Request:** `POST /transcribe` com `multipart/form-data`
- Campo `file`: arquivo de áudio/vídeo
- Campo `language`: ex. `pt-BR` (opcional)

**Response de sucesso:**
```json
{
  "status": "success",
  "language": "pt-BR",
  "durationSeconds": 1840,
  "text": "Transcrição completa...",
  "confidence": 0.89,
  "segments": [
    {
      "speakerLabel": "Nutricionista",
      "speakerRole": "NUTRITIONIST",
      "startSeconds": 0,
      "endSeconds": 12.4,
      "text": "Olá, como você está?",
      "confidence": 0.91
    }
  ]
}
```

**Response de erro:**
```json
{
  "status": "error",
  "message": "Could not transcribe audio"
}
```

### Exemplo de microserviço Python (faster-whisper)

```python
# fastapi_whisper.py
from fastapi import FastAPI, UploadFile, File, Form
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI()
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("pt")):
    audio_bytes = await file.read()
    # salvar temp e transcrever
    segments, info = model.transcribe(audio_bytes, language=language[:2])
    
    segs = [{"text": s.text, "startSeconds": s.start, "endSeconds": s.end} for s in segments]
    full_text = " ".join(s["text"] for s in segs)
    
    return {
        "status": "success",
        "language": info.language,
        "durationSeconds": info.duration,
        "text": full_text,
        "segments": segs
    }

if __name__ == "__main__":
    uvicorn.run(app, port=8001)
```

## LOCAL_WHISPER

Preparado para execução de binário local. Por enquanto retorna erro informando para usar CUSTOM_HTTP.

```env
TRANSCRIPTION_PROVIDER=LOCAL_WHISPER
LOCAL_WHISPER_BINARY_PATH=/usr/local/bin/whisper
LOCAL_WHISPER_MODEL_PATH=/models/whisper
LOCAL_WHISPER_MODEL=base
```

**Status**: estrutura criada, não executa o binário nesta versão. Use CUSTOM_HTTP.

## OPENAI_WHISPER_API

Envia áudio para a API da OpenAI via `multipart/form-data`.

```env
TRANSCRIPTION_PROVIDER=OPENAI_WHISPER_API
OPENAI_API_KEY=sk-...
```

Custo: ~$0.006/min de áudio. Requer consentimento explícito do paciente.

## ELEVENLABS

Integração com ElevenLabs Speech-to-Text.

```env
TRANSCRIPTION_PROVIDER=ELEVENLABS
ELEVENLABS_API_KEY=...
```

## DISABLED

Desativa completamente o processamento automático. Transcrições manuais continuam funcionando.

```env
TRANSCRIPTION_PROVIDER=DISABLED
```

## Comparativo

| Provider | Custo | Qualidade | Privacidade | Latência |
|----------|-------|-----------|-------------|----------|
| MANUAL | Grátis | N/A | Total | Imediato |
| CUSTOM_HTTP (Whisper local) | Grátis | Alta | Total (local) | Médio |
| LOCAL_WHISPER | Grátis | Alta | Total (local) | Médio |
| OPENAI_WHISPER_API | ~$0.006/min | Muito alta | Dados no cloud | Baixo |
| ELEVENLABS | Pago | Alta | Dados no cloud | Baixo |

## Para produção

1. **MVP**: `MANUAL` + upload manual de texto
2. **Com hardware disponível**: `CUSTOM_HTTP` com `faster-whisper` em container Docker
3. **Maior qualidade sem infra**: `OPENAI_WHISPER_API` (requer consentimento LGPD)
