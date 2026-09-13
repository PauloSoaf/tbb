import { TranscriptionProvider } from "@prisma/client"
import type { TranscriptionProviderClient } from "./transcription.types"
import { ManualTranscriptionProvider } from "./manual-transcription.provider"
import { CustomHttpTranscriptionProvider } from "./custom-http-transcription.provider"
import { LocalWhisperProvider } from "./local-whisper.provider"
import { OpenAIWhisperProvider } from "./openai-whisper.provider"

/**
 * Returns the appropriate TranscriptionProviderClient for the given provider enum value.
 *
 * Throws if:
 *  - The provider is explicitly DISABLED (or an unknown value)
 *  - Required environment variables for the provider are not set
 *
 * Note: ELEVENLABS and NOTTA_EXTERNAL are not yet implemented.
 */
export function getTranscriptionProvider(provider: TranscriptionProvider): TranscriptionProviderClient {
  switch (provider) {
    case TranscriptionProvider.MANUAL:
      return new ManualTranscriptionProvider()

    case TranscriptionProvider.LOCAL_WHISPER:
      return new LocalWhisperProvider()

    case TranscriptionProvider.CUSTOM_HTTP: {
      const url = process.env.CUSTOM_TRANSCRIPTION_HTTP_URL
      if (!url) {
        throw new Error(
          "CUSTOM_HTTP provider is enabled but CUSTOM_TRANSCRIPTION_HTTP_URL is not set. " +
            "Set this environment variable to the URL of your transcription microservice."
        )
      }
      return new CustomHttpTranscriptionProvider()
    }

    case TranscriptionProvider.OPENAI_WHISPER_API: {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error(
          "OPENAI_WHISPER_API provider is enabled but OPENAI_API_KEY is not set. " +
            "Set OPENAI_API_KEY to your OpenAI secret key."
        )
      }
      return new OpenAIWhisperProvider()
    }

    case TranscriptionProvider.ELEVENLABS:
      throw new Error(
        "ELEVENLABS transcription provider is not yet implemented. " +
          "Use CUSTOM_HTTP pointing to an ElevenLabs-compatible proxy, or choose another provider."
      )

    case TranscriptionProvider.NOTTA_EXTERNAL:
      throw new Error(
        "NOTTA_EXTERNAL transcription provider is not yet implemented. " +
          "Notta is an external service that must be configured separately."
      )

    default: {
      const exhaustive: never = provider
      throw new Error(`Unknown transcription provider: ${String(exhaustive)}`)
    }
  }
}
