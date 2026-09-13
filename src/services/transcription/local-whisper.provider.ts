import type { TranscriptionInput, TranscriptionProviderClient, TranscriptionResult } from "./transcription.types"

/**
 * LOCAL_WHISPER provider stub.
 *
 * Running Whisper locally requires an out-of-process transcription service
 * because Node.js cannot execute Python or native C++ binaries inline.
 *
 * Recommended setup options:
 *
 * 1. faster-whisper microservice
 *    - Install: pip install faster-whisper flask
 *    - Wrap in a small Flask/FastAPI server that accepts multipart POST requests
 *    - Set CUSTOM_TRANSCRIPTION_HTTP_URL=http://localhost:8765/transcribe
 *    - Use the CUSTOM_HTTP provider instead of LOCAL_WHISPER
 *
 * 2. whisper.cpp microservice
 *    - Build whisper.cpp with the server example (examples/server)
 *    - The server exposes a compatible multipart endpoint
 *    - Set CUSTOM_TRANSCRIPTION_HTTP_URL=http://localhost:8080/inference
 *    - Use the CUSTOM_HTTP provider instead of LOCAL_WHISPER
 *
 * 3. OpenAI-compatible local servers (LocalAI, Ollama with whisper model)
 *    - These typically expose an endpoint compatible with the OpenAI Whisper API
 *    - Set OPENAI_API_KEY=any-non-empty-value and OPENAI_BASE_URL=http://localhost:11434
 *    - Use the OPENAI_WHISPER_API provider instead
 *
 * This provider always throws to remind operators to configure one of the above.
 */
export class LocalWhisperProvider implements TranscriptionProviderClient {
  transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error(
      "LOCAL_WHISPER: configure the CUSTOM_HTTP provider pointing to a local Whisper microservice. " +
        "See faster-whisper or whisper.cpp server examples. " +
        "Set CUSTOM_TRANSCRIPTION_HTTP_URL and use provider=CUSTOM_HTTP."
    )
  }
}
