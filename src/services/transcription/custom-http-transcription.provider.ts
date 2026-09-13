import type { TranscriptionInput, TranscriptionProviderClient, TranscriptionResult, TranscriptionSegmentDraft } from "./transcription.types"

interface CustomHttpProviderResponse {
  status: "success" | "error"
  text?: string
  language?: string
  durationSeconds?: number
  confidence?: number
  segments?: Array<{
    speakerLabel?: string
    speakerRole?: string
    startSeconds?: number
    endSeconds?: number
    text: string
    confidence?: number
    position?: number
  }>
  error?: string
}

/**
 * Custom HTTP transcription provider.
 *
 * Sends the audio file to an arbitrary HTTP endpoint configured via
 * CUSTOM_TRANSCRIPTION_HTTP_URL. The request is a multipart/form-data POST
 * with the following fields:
 *   - audio: the raw audio file (fetched from audioUrl)
 *   - language: the requested language code (optional)
 *
 * If CUSTOM_TRANSCRIPTION_HTTP_TOKEN is set, it is sent as a Bearer token in
 * the Authorization header.
 *
 * The expected JSON response shape is:
 * {
 *   status: "success" | "error",
 *   text?: string,
 *   language?: string,
 *   durationSeconds?: number,
 *   confidence?: number,   // 0–1
 *   segments?: [{ speakerLabel, speakerRole, startSeconds, endSeconds, text, confidence, position }],
 *   error?: string         // present when status === "error"
 * }
 */
export class CustomHttpTranscriptionProvider implements TranscriptionProviderClient {
  private readonly endpointUrl: string
  private readonly token: string | undefined

  constructor() {
    const url = process.env.CUSTOM_TRANSCRIPTION_HTTP_URL
    if (!url) {
      throw new Error(
        "CUSTOM_HTTP provider requires CUSTOM_TRANSCRIPTION_HTTP_URL to be set."
      )
    }
    this.endpointUrl = url
    this.token = process.env.CUSTOM_TRANSCRIPTION_HTTP_TOKEN
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const { audioUrl, language } = input

    if (!audioUrl) {
      throw new Error("CUSTOM_HTTP provider requires audioUrl to be set on the transcription record.")
    }

    // Fetch the audio file from storage
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch audio from storage: ${audioResponse.status} ${audioResponse.statusText}`
      )
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBlob = new Blob([audioBuffer])

    // Build multipart form-data
    const formData = new FormData()
    formData.append("audio", audioBlob, "audio")
    if (language) {
      formData.append("language", language)
    }

    // Build request headers
    const headers: HeadersInit = {}
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    // POST to custom endpoint
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers,
      body: formData,
    })

    if (!response.ok) {
      throw new Error(
        `CUSTOM_HTTP transcription endpoint returned ${response.status} ${response.statusText}`
      )
    }

    const json = (await response.json()) as CustomHttpProviderResponse

    if (json.status === "error") {
      throw new Error(
        `CUSTOM_HTTP transcription service returned an error: ${json.error ?? "unknown error"}`
      )
    }

    if (!json.text) {
      throw new Error("CUSTOM_HTTP transcription service returned no transcript text.")
    }

    const segments: TranscriptionSegmentDraft[] | undefined = json.segments?.map((seg) => ({
      speakerLabel: seg.speakerLabel,
      speakerRole: seg.speakerRole,
      startSeconds: seg.startSeconds,
      endSeconds: seg.endSeconds,
      text: seg.text,
      confidence: seg.confidence,
      position: seg.position,
    }))

    return {
      text: json.text,
      language: json.language,
      confidence: json.confidence,
      durationSeconds: json.durationSeconds,
      segments,
      raw: json,
    }
  }
}
