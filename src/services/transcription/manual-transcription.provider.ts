import type { TranscriptionInput, TranscriptionProviderClient, TranscriptionResult } from "./transcription.types"

/**
 * Manual transcription provider.
 * Manual transcriptions are written directly by the nutritionist — there is no
 * automatic processing pipeline. Calling transcribe() on this provider always
 * throws because the text is supplied by the user, not by an audio processor.
 */
export class ManualTranscriptionProvider implements TranscriptionProviderClient {
  transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error(
      "MANUAL provider does not support automatic processing. " +
        "Manual transcriptions are provided directly by the user via the edit UI."
    )
  }
}
