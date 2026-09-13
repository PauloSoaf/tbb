import { z } from "zod"
import { TranscriptSpeakerSource, TranscriptionVisibility } from "@prisma/client"

// ─── Segment ──────────────────────────────────────────────────────────────────

export const transcriptionSegmentSchema = z.object({
  speakerLabel: z.string().optional(),
  speakerRole: z.string().optional(),
  startSeconds: z.number().nonnegative().optional(),
  endSeconds: z.number().nonnegative().optional(),
  text: z.string().min(1, "Segment text is required"),
  confidence: z.number().min(0).max(1).optional(),
  position: z.number().int().default(0),
})

export type TranscriptionSegmentInput = z.infer<typeof transcriptionSegmentSchema>

// ─── Provider result (external response validation) ───────────────────────────

export const transcriptionProviderResultSchema = z.object({
  status: z.enum(["success", "error"]),
  text: z.string().optional(),
  language: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  segments: z.array(transcriptionSegmentSchema).optional(),
})

export type TranscriptionProviderResult = z.infer<typeof transcriptionProviderResultSchema>

// ─── Create manual ────────────────────────────────────────────────────────────

export const createManualTranscriptionSchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
  careSessionId: z.string().optional(),
  appointmentId: z.string().optional(),
  title: z.string().optional(),
  rawTranscript: z.string().optional(),
  language: z.string().default("pt-BR"),
  consentForRecording: z.boolean().default(false),
  consentForTranscription: z.boolean().default(false),
})

export type CreateManualTranscriptionInput = z.infer<typeof createManualTranscriptionSchema>

// ─── Upload audio ─────────────────────────────────────────────────────────────

export const uploadTranscriptionAudioSchema = z.object({
  transcriptionId: z.string().min(1, "transcriptionId is required"),
  consentForRecording: z.boolean(),
  consentForTranscription: z.boolean(),
})

export type UploadTranscriptionAudioInput = z.infer<typeof uploadTranscriptionAudioSchema>

// ─── Update transcript text ───────────────────────────────────────────────────

export const updateTranscriptionSchema = z.object({
  editedTranscript: z.string().optional(),
  clinicalSummary: z.string().optional(),
  patientFriendlySummary: z.string().optional(),
  title: z.string().optional(),
})

export type UpdateTranscriptionInput = z.infer<typeof updateTranscriptionSchema>

// ─── Approve / reject / visibility ───────────────────────────────────────────

export const approveTranscriptionSchema = z.object({
  transcriptionId: z.string().min(1, "transcriptionId is required"),
})

export type ApproveTranscriptionInput = z.infer<typeof approveTranscriptionSchema>

export const rejectTranscriptionSchema = z.object({
  transcriptionId: z.string().min(1, "transcriptionId is required"),
  reason: z.string().optional(),
})

export type RejectTranscriptionInput = z.infer<typeof rejectTranscriptionSchema>

export const setTranscriptionVisibilitySchema = z.object({
  transcriptionId: z.string().min(1, "transcriptionId is required"),
  visibility: z.nativeEnum(TranscriptionVisibility),
})

export type SetTranscriptionVisibilityInput = z.infer<typeof setTranscriptionVisibilitySchema>

// ─── Realtime product transcription ─────────────────────────────────────────

export const realtimeProviderNameSchema = z.enum([
  "speaches",
  "whisper_live",
  "whisper_cpp",
  "vosk",
  "mock",
])

export const startAutomaticTranscriptionSchema = z
  .object({
    appointmentId: z.string().cuid().optional(),
    careSessionId: z.string().cuid().optional(),
    mode: z.enum(["online", "in_person"]),
    autoStarted: z.boolean().default(true),
    noticeConfirmed: z.boolean().default(false),
    participantId: z.string().min(1).max(128),
    speakerName: z.string().min(1).max(160),
    speakerRole: z.nativeEnum(TranscriptSpeakerSource),
  })
  .refine((value) => Boolean(value.appointmentId || value.careSessionId), {
    message: "appointmentId or careSessionId is required",
  })

export const transcriptIdSchema = z.object({
  transcriptId: z.string().cuid(),
})

export const finalTranscriptSegmentSchema = z.object({
  id: z.string().min(1).max(160),
  participantId: z.string().min(1).max(128).optional(),
  speakerUserId: z.string().cuid().optional(),
  speakerPatientId: z.string().cuid().optional(),
  speakerNameSnapshot: z.string().max(160).optional(),
  speakerRoleSnapshot: z.string().max(80).optional(),
  source: z.nativeEnum(TranscriptSpeakerSource).default("UNKNOWN"),
  kind: z.literal("final").default("final"),
  text: z.string().trim().min(1).max(20_000),
  confidence: z.number().min(0).max(1).optional(),
  startedAtMs: z.number().int().nonnegative().optional(),
  endedAtMs: z.number().int().nonnegative().optional(),
  clientTimestamp: z.string().datetime(),
  providerTimestamp: z.string().datetime().optional(),
  providerLatencyMs: z.number().int().nonnegative().max(300_000).optional(),
})

export const bulkFinalTranscriptSegmentsSchema = z.object({
  transcriptId: z.string().cuid(),
  segments: z.array(finalTranscriptSegmentSchema).min(1).max(100),
})

export const updateTranscriptionSettingsSchema = z.object({
  enabled: z.boolean(),
  autoStartOnlineAppointments: z.boolean(),
  autoStartInPersonAppointments: z.boolean(),
  requirePatientNotice: z.boolean(),
  requireInPersonConfirmation: z.boolean(),
  saveTranscriptByDefault: z.boolean(),
  attachToMedicalRecordByDefault: z.boolean(),
  provider: realtimeProviderNameSchema,
  model: z.string().trim().min(1).max(240),
  fallbackModel: z.string().trim().min(1).max(240),
  language: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  sampleRate: z.number().int().min(8_000).max(48_000),
  chunkMs: z.number().int().min(250).max(5_000),
  saveAudio: z.literal(false).default(false),
  maxSessionMinutes: z.number().int().min(5).max(480).nullable(),
})

export const attachTranscriptionToMedicalRecordSchema = z.object({
  transcriptId: z.string().cuid(),
  reviewedText: z.string().trim().min(1).max(200_000),
})

export const updateTranscriptParticipantSchema = z.object({
  transcriptId: z.string().cuid(),
  participantId: z.string().min(1).max(128),
  speakerUserId: z.string().cuid().optional(),
  speakerPatientId: z.string().cuid().optional(),
  speakerNameSnapshot: z.string().max(160).optional(),
  source: z.nativeEnum(TranscriptSpeakerSource),
  audioState: z.enum([
    "idle",
    "requesting_permission",
    "ready",
    "capturing",
    "paused",
    "stopped",
    "permission_denied",
    "device_not_found",
    "unsupported",
    "offline",
    "error",
  ]),
  noticeAcknowledged: z.boolean().optional(),
  consentDeclined: z.boolean().optional(),
})

export const updateTranscriptSegmentSpeakerSchema = z.object({
  transcriptId: z.string().cuid(),
  segmentKey: z.string().min(1).max(160),
  speakerNameSnapshot: z.string().trim().min(1).max(160),
  source: z.nativeEnum(TranscriptSpeakerSource),
})

export const createTranscriptionTokenSchema = z.object({
  transcriptId: z.string().cuid(),
  participantId: z.string().min(1).max(128),
})

export type StartAutomaticTranscriptionInput = z.infer<typeof startAutomaticTranscriptionSchema>
export type FinalTranscriptSegmentInput = z.infer<typeof finalTranscriptSegmentSchema>
export type UpdateTranscriptionSettingsInput = z.infer<typeof updateTranscriptionSettingsSchema>
export type UpdateTranscriptParticipantInput = z.infer<typeof updateTranscriptParticipantSchema>
export type UpdateTranscriptSegmentSpeakerInput = z.infer<typeof updateTranscriptSegmentSpeakerSchema>
