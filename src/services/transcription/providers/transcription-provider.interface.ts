export type TranscriptionProviderName =
  | "speaches"
  | "whisper_live"
  | "whisper_cpp"
  | "vosk"
  | "mock";

export type TranscriptionConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "reconnecting"
  | "stopped"
  | "offline"
  | "error";

export type TranscriptionSegmentKind = "partial" | "final";

export type TranscriptionSpeakerSource =
  | "NUTRITIONIST"
  | "PATIENT"
  | "TEAM_MEMBER"
  | "IN_PERSON_ROOM"
  | "UNKNOWN";

export interface TranscriptionProviderConfig {
  provider: TranscriptionProviderName;
  websocketUrl: string;
  httpUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  refreshSession?: () => Promise<{
    sessionToken: string;
    websocketUrl?: string;
  }>;
  model: string;
  language: string;
  sampleRate: number;
  chunkMs: number;
  appointmentId: string;
  tenantId: string;
  participantId: string;
  speakerName: string;
  speakerRole: TranscriptionSpeakerSource;
}

export interface LiveTranscriptionSegment {
  id: string;
  tenantId: string;
  appointmentId: string;
  transcriptId?: string;
  participantId?: string;
  speakerNameSnapshot?: string;
  speakerRoleSnapshot?: TranscriptionSpeakerSource;
  kind: TranscriptionSegmentKind;
  text: string;
  confidence?: number;
  startedAtMs?: number;
  endedAtMs?: number;
  clientTimestamp: string;
  providerTimestamp?: string;
}

export interface LiveTranscriptionProvider {
  connect(config: TranscriptionProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  sendAudioChunk(chunk: ArrayBuffer | Blob): Promise<void>;
  onPartialTranscript(callback: (segment: LiveTranscriptionSegment) => void): void;
  onFinalTranscript(callback: (segment: LiveTranscriptionSegment) => void): void;
  onStatusChange(callback: (status: TranscriptionConnectionStatus) => void): void;
  onError(callback: (error: Error) => void): void;
}
