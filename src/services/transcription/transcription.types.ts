export type TranscriptionInput = {
  nutritionistId: string
  patientId: string
  transcriptionId: string
  audioUrl?: string
  audioStorageKey?: string
  language?: string
}

export type TranscriptionSegmentDraft = {
  speakerLabel?: string
  speakerRole?: string
  startSeconds?: number
  endSeconds?: number
  text: string
  confidence?: number
  position?: number
}

export type TranscriptionResult = {
  text: string
  language?: string
  confidence?: number
  durationSeconds?: number
  segments?: TranscriptionSegmentDraft[]
  raw?: unknown
}

export interface TranscriptionProviderClient {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>
}
