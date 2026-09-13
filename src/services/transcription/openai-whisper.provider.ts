import type { TranscriptionInput, TranscriptionProviderClient, TranscriptionResult, TranscriptionSegmentDraft } from "./transcription.types"

interface OpenAIWhisperVerboseResponse {
  task: string
  language: string
  duration: number
  text: string
  segments?: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
  }>
}

/**
 * OpenAI Whisper API transcription provider.
 *
 * Sends the audio file to the OpenAI Audio Transcriptions endpoint:
 *   POST https://api.openai.com/v1/audio/transcriptions
 *
 * Required environment variable:
 *   OPENAI_API_KEY — your OpenAI secret key
 *
 * Optional environment variable:
 *   OPENAI_BASE_URL — override the base URL (useful for LocalAI / Ollama compatible endpoints)
 *   OPENAI_WHISPER_MODEL — model to use (default: "whisper-1")
 */
export class OpenAIWhisperProvider implements TranscriptionProviderClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        "OPENAI_WHISPER_API provider requires OPENAI_API_KEY to be set."
      )
    }
    this.apiKey = apiKey
    this.baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "")
    this.model = process.env.OPENAI_WHISPER_MODEL ?? "whisper-1"
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const { audioUrl, language } = input

    if (!audioUrl) {
      throw new Error("OPENAI_WHISPER_API provider requires audioUrl to be set on the transcription record.")
    }

    // Fetch the audio file from storage
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch audio from storage: ${audioResponse.status} ${audioResponse.statusText}`
      )
    }

    const audioBuffer = await audioResponse.arrayBuffer()

    // Determine file name from URL for the multipart boundary
    const urlParts = audioUrl.split("/")
    const fileName = urlParts[urlParts.length - 1] ?? "audio.mp3"

    const audioBlob = new Blob([audioBuffer])

    // Build multipart form-data for OpenAI
    const formData = new FormData()
    formData.append("file", audioBlob, fileName)
    formData.append("model", this.model)
    formData.append("response_format", "verbose_json")
    if (language) {
      // OpenAI Whisper accepts ISO-639-1 codes ("pt", "en", "es")
      // If the caller passes "pt-BR" we strip the region suffix
      const langCode = language.split("-")[0]
      if (langCode) {
        formData.append("language", langCode)
      }
    }

    const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `OpenAI Whisper API returned ${response.status} ${response.statusText}: ${errorBody}`
      )
    }

    const json = (await response.json()) as OpenAIWhisperVerboseResponse

    if (!json.text) {
      throw new Error("OpenAI Whisper API returned an empty transcript.")
    }

    // Map OpenAI segments to our internal segment draft format
    // OpenAI doesn't provide speaker diarisation out of the box,
    // so speakerLabel / speakerRole are left undefined.
    const segments: TranscriptionSegmentDraft[] | undefined = json.segments?.map((seg, idx) => ({
      startSeconds: seg.start,
      endSeconds: seg.end,
      text: seg.text.trim(),
      position: idx,
    }))

    // OpenAI doesn't return a single confidence score for the full transcript.
    // We approximate it from the average log-probability of segments if available.
    let confidence: number | undefined
    if (json.segments && json.segments.length > 0) {
      const avgLogProb =
        json.segments.reduce((sum, seg) => sum + seg.avg_logprob, 0) / json.segments.length
      // Convert avg_logprob (typically -0.5 to 0) to a 0–1 confidence score
      confidence = Math.min(1, Math.max(0, Math.exp(avgLogProb)))
    }

    return {
      text: json.text,
      language: json.language,
      confidence,
      durationSeconds: json.duration,
      segments,
      raw: json,
    }
  }
}
