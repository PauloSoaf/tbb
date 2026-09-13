export type RealtimeTranscriptionStatus =
  | "idle"
  | "auto_starting"
  | "connecting"
  | "active"
  | "paused"
  | "reconnecting"
  | "stopping"
  | "stopped"
  | "saved"
  | "discarded"
  | "offline"
  | "error";

export type AudioCaptureStatus =
  | "idle"
  | "requesting_permission"
  | "ready"
  | "capturing"
  | "paused"
  | "stopping"
  | "stopped"
  | "permission_denied"
  | "device_not_found"
  | "unsupported"
  | "error";

export type TranscriptionProviderHealth =
  | "online"
  | "offline"
  | "checking"
  | "degraded"
  | "reconnecting";

export type TranscriptionParticipantState =
  | "transcribing"
  | "ready"
  | "muted"
  | "paused"
  | "permission_denied"
  | "not_connected"
  | "unsupported"
  | "error";

export type TranscriptionSpeakerSource =
  | "NUTRITIONIST"
  | "PATIENT"
  | "TEAM_MEMBER"
  | "IN_PERSON_ROOM"
  | "UNKNOWN";

export interface RealtimeTranscriptSegment {
  id: string;
  text: string;
  kind?: "partial" | "final";
  participantId?: string;
  speakerName?: string;
  speakerSource?: TranscriptionSpeakerSource;
  startedAtMs?: number;
  endedAtMs?: number;
  clientTimestamp?: string;
  confidence?: number;
}

export interface TranscriptionParticipant {
  id: string;
  name: string;
  source: TranscriptionSpeakerSource;
  status: TranscriptionParticipantState;
  audioLevel?: number;
  isLocal?: boolean;
}

export interface TranscriptionProviderInfo {
  name: string;
  model?: string;
  language?: string;
  health: TranscriptionProviderHealth;
  latencyMs?: number;
  lastCheckedAt?: string;
}

export interface TranscriptionSessionSummary {
  durationSeconds: number;
  segmentCount: number;
  participantCount: number;
  startedAt?: string;
  endedAt?: string;
  saved?: boolean;
  attachedToMedicalRecord?: boolean;
}

export interface TranscriptionUiError {
  code?: string;
  titleKey?: string;
  descriptionKey: string;
  recoverable?: boolean;
}

