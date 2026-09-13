import {
  TranscriptionProvider,
  TranscriptionStatus,
  TranscriptionVisibility,
  TranscriptionSourceType,
  type ConsultationTranscription,
  type ConsultationTranscriptionSegment,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getTranscriptionProvider } from "./transcription-provider-registry"
import { deleteTranscriptionAudio } from "./transcription-storage.service"
import type { TranscriptionSegmentDraft } from "./transcription.types"

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createManualTranscription(args: {
  nutritionistId: string
  patientId: string
  careSessionId?: string
  appointmentId?: string
  title?: string
  rawTranscript?: string
  language?: string
  consentForRecording?: boolean
  consentForTranscription?: boolean
}): Promise<ConsultationTranscription> {
  const {
    nutritionistId,
    patientId,
    careSessionId,
    appointmentId,
    title,
    rawTranscript,
    language,
    consentForRecording,
    consentForTranscription,
  } = args

  // Determine source type
  let sourceType: TranscriptionSourceType = TranscriptionSourceType.MANUAL_NOTE
  if (careSessionId) sourceType = TranscriptionSourceType.CARE_SESSION
  else if (appointmentId) sourceType = TranscriptionSourceType.APPOINTMENT

  // If text was provided, mark as completed; otherwise not started
  const status = rawTranscript
    ? TranscriptionStatus.COMPLETED
    : TranscriptionStatus.NOT_STARTED

  const consentAt =
    consentForRecording || consentForTranscription ? new Date() : undefined

  return prisma.consultationTranscription.create({
    data: {
      nutritionistId,
      patientId,
      careSessionId,
      appointmentId,
      provider: TranscriptionProvider.MANUAL,
      status,
      sourceType,
      visibility: TranscriptionVisibility.NUTRITIONIST_ONLY,
      title: title ?? null,
      language: language ?? "pt-BR",
      rawTranscript: rawTranscript ?? null,
      consentForRecording: consentForRecording ?? false,
      consentForTranscription: consentForTranscription ?? false,
      consentCollectedAt: consentAt ?? null,
    },
  })
}

// ─── Audio ────────────────────────────────────────────────────────────────────

export async function setTranscriptionAudio(
  transcriptionId: string,
  nutritionistId: string,
  audio: {
    url: string
    storageKey: string
    mimeType: string
    sizeBytes: number
  }
): Promise<ConsultationTranscription> {
  // Ensure ownership
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  return prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: {
      audioUrl: audio.url,
      audioStorageKey: audio.storageKey,
      audioMimeType: audio.mimeType,
      audioSizeBytes: audio.sizeBytes,
      status: TranscriptionStatus.UPLOADED,
    },
  })
}

// ─── Processing ───────────────────────────────────────────────────────────────

export async function processTranscription(
  transcriptionId: string,
  nutritionistId: string
): Promise<ConsultationTranscription> {
  const transcription = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!transcription) {
    throw new Error("Transcription not found.")
  }
  if (!transcription.audioUrl) {
    throw new Error("No audio file attached. Upload an audio file before processing.")
  }

  // Mark as processing
  await prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: { status: TranscriptionStatus.PROCESSING },
  })

  try {
    const providerClient = getTranscriptionProvider(transcription.provider)

    const result = await providerClient.transcribe({
      nutritionistId,
      patientId: transcription.patientId,
      transcriptionId,
      audioUrl: transcription.audioUrl ?? undefined,
      audioStorageKey: transcription.audioStorageKey ?? undefined,
      language: transcription.language ?? undefined,
    })

    // Persist result
    const updated = await prisma.consultationTranscription.update({
      where: { id: transcriptionId },
      data: {
        status: TranscriptionStatus.COMPLETED,
        rawTranscript: result.text,
        language: result.language ?? transcription.language,
        confidence: result.confidence ?? null,
        audioDurationSeconds: result.durationSeconds ?? null,
        aiRawResult: result.raw !== undefined ? (result.raw as object) : undefined,
      },
    })

    // Persist segments if provided
    if (result.segments && result.segments.length > 0) {
      await saveTranscriptionSegments(transcriptionId, nutritionistId, result.segments)
    }

    return updated
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    const failed = await prisma.consultationTranscription.update({
      where: { id: transcriptionId },
      data: {
        status: TranscriptionStatus.FAILED,
        errorMessage,
      },
    })

    return failed
  }
}

// ─── Text updates ─────────────────────────────────────────────────────────────

export async function updateTranscriptionText(
  transcriptionId: string,
  nutritionistId: string,
  data: {
    editedTranscript?: string
    clinicalSummary?: string
    patientFriendlySummary?: string
    title?: string
  }
): Promise<ConsultationTranscription> {
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  return prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: {
      editedTranscript: data.editedTranscript,
      clinicalSummary: data.clinicalSummary,
      patientFriendlySummary: data.patientFriendlySummary,
      title: data.title,
      // If someone edits the transcript, mark it as needing review if it was COMPLETED
      ...(data.editedTranscript !== undefined &&
        existing.status === TranscriptionStatus.COMPLETED
        ? { status: TranscriptionStatus.NEEDS_REVIEW }
        : {}),
    },
  })
}

// ─── Status transitions ───────────────────────────────────────────────────────

export async function approveTranscription(
  transcriptionId: string,
  nutritionistId: string
): Promise<ConsultationTranscription> {
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  return prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: {
      status: TranscriptionStatus.APPROVED,
      approvedAt: new Date(),
      rejectedAt: null,
      errorMessage: null,
    },
  })
}

export async function rejectTranscription(
  transcriptionId: string,
  nutritionistId: string,
  reason?: string
): Promise<ConsultationTranscription> {
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  return prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: {
      status: TranscriptionStatus.REJECTED,
      rejectedAt: new Date(),
      approvedAt: null,
      errorMessage: reason ?? null,
    },
  })
}

export async function setTranscriptionVisibility(
  transcriptionId: string,
  nutritionistId: string,
  visibility: TranscriptionVisibility
): Promise<ConsultationTranscription> {
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  return prisma.consultationTranscription.update({
    where: { id: transcriptionId },
    data: { visibility },
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getTranscription(
  transcriptionId: string,
  nutritionistId: string
): Promise<(ConsultationTranscription & { segments: ConsultationTranscriptionSegment[] }) | null> {
  return prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
    include: {
      segments: {
        orderBy: { position: "asc" },
      },
    },
  })
}

export async function getTranscriptionsByPatient(
  nutritionistId: string,
  patientId: string,
  opts?: { limit?: number; status?: TranscriptionStatus }
): Promise<ConsultationTranscription[]> {
  return prisma.consultationTranscription.findMany({
    where: {
      nutritionistId,
      patientId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  })
}

export async function getTranscriptionsByCareSession(
  nutritionistId: string,
  careSessionId: string
) {
  return prisma.consultationTranscription.findMany({
    where: { nutritionistId, careSessionId },
    orderBy: { createdAt: "desc" },
    include: { segments: { orderBy: { position: "asc" } } },
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTranscription(
  transcriptionId: string,
  nutritionistId: string
): Promise<void> {
  const existing = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
  })
  if (!existing) {
    throw new Error("Transcription not found.")
  }

  // Delete audio from storage if present
  if (existing.audioStorageKey) {
    try {
      await deleteTranscriptionAudio(nutritionistId, existing.audioStorageKey)
    } catch {
      // Log but don't block deletion if storage removal fails
      console.error(
        `[transcription.service] Failed to delete audio for transcription ${transcriptionId}`,
        existing.audioStorageKey
      )
    }
  }

  // Cascade delete: segments are deleted by DB cascade or explicit delete
  await prisma.consultationTranscriptionSegment.deleteMany({
    where: { transcriptionId, nutritionistId },
  })

  await prisma.consultationTranscription.delete({
    where: { id: transcriptionId },
  })
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export async function saveTranscriptionSegments(
  transcriptionId: string,
  nutritionistId: string,
  segments: TranscriptionSegmentDraft[]
): Promise<void> {
  // Verify ownership before writing segments
  const transcription = await prisma.consultationTranscription.findFirst({
    where: { id: transcriptionId, nutritionistId },
    select: { id: true, nutritionistId: true },
  })
  if (!transcription) {
    throw new Error("Transcription not found.")
  }

  // Replace all existing segments with the new batch
  await prisma.consultationTranscriptionSegment.deleteMany({
    where: { transcriptionId, nutritionistId },
  })

  if (segments.length === 0) return

  await prisma.consultationTranscriptionSegment.createMany({
    data: segments.map((seg, idx) => ({
      nutritionistId,
      transcriptionId,
      speakerLabel: seg.speakerLabel ?? null,
      speakerRole: seg.speakerRole ?? null,
      startSeconds: seg.startSeconds ?? null,
      endSeconds: seg.endSeconds ?? null,
      text: seg.text,
      confidence: seg.confidence ?? null,
      position: seg.position ?? idx,
    })),
  })
}
