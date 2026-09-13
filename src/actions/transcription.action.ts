"use server"

import { TranscriptionVisibility } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess"
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/tenancy/requirePermission"
import { auditLogService } from "@/services/audit-log.service"
import { getTenantSubscriptionContext, requireFeature } from "@/lib/billing/subscription-context"
import {
  invalidatePatientDetail,
  invalidateAfterCareSessionMutation,
} from "@/lib/cache/invalidate-nutriopus-cache"
import {
  createManualTranscription,
  setTranscriptionAudio,
  processTranscription,
  updateTranscriptionText,
  approveTranscription,
  rejectTranscription,
  setTranscriptionVisibility,
  deleteTranscription as deleteLegacyTranscription,
  getTranscription,
  getTranscriptionsByPatient,
  getTranscriptionsByCareSession,
} from "@/services/transcription/transcription.service"
import {
  TranscriptionDomainError,
  appendFinalTranscriptSegments,
  attachTranscriptionToMedicalRecord,
  createTranscriptionSession,
  createTranscriptionSessionToken,
  deleteRealtimeTranscription,
  discardTranscriptionSession,
  finalizeTranscriptionSession,
  getActiveTranscriptionSession,
  getTranscriptionProviderStatus,
  getTranscriptionSession,
  getTranscriptionSettings,
  pauseTranscriptionSession,
  resumeTranscriptionSession,
  startTranscriptionSession,
  stopTranscriptionSession,
  updateTranscriptSegmentSpeaker,
  updateTranscriptionParticipant,
  updateTranscriptionSettings,
} from "@/services/transcription/transcription-session.service"
import { uploadTranscriptionAudio } from "@/services/transcription/transcription-storage.service"
import {
  createManualTranscriptionSchema,
  updateTranscriptionSchema,
  approveTranscriptionSchema,
  rejectTranscriptionSchema,
  setTranscriptionVisibilitySchema,
  attachTranscriptionToMedicalRecordSchema,
  bulkFinalTranscriptSegmentsSchema,
  createTranscriptionTokenSchema,
  finalTranscriptSegmentSchema,
  startAutomaticTranscriptionSchema,
  transcriptIdSchema,
  updateTranscriptSegmentSpeakerSchema,
  updateTranscriptParticipantSchema,
  updateTranscriptionSettingsSchema,
} from "@/validation/transcription.schema"

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE_MB = 100
const DEFAULT_ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac",
  "video/mp4",
  "video/webm",
]

function getMaxAudioSizeBytes(): number {
  const fromEnv = process.env.TRANSCRIPTION_MAX_AUDIO_SIZE_MB
  const mb = fromEnv ? parseInt(fromEnv, 10) : DEFAULT_MAX_SIZE_MB
  return (isNaN(mb) ? DEFAULT_MAX_SIZE_MB : mb) * 1024 * 1024
}

function getAllowedMimeTypes(): string[] {
  const fromEnv = process.env.TRANSCRIPTION_ALLOWED_TYPES
  if (!fromEnv) return DEFAULT_ALLOWED_TYPES
  return fromEnv.split(",").map((t) => t.trim()).filter(Boolean)
}

// ─── Create manual transcription ──────────────────────────────────────────────

export async function createManualTranscriptionAction(
  tenantSlug: string,
  data: {
    patientId: string
    careSessionId?: string
    appointmentId?: string
    title?: string
    rawTranscript?: string
    language?: string
    consentForRecording?: boolean
    consentForTranscription?: boolean
  }
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const parsed = createManualTranscriptionSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
    }

    const transcription = await createManualTranscription({
      nutritionistId,
      ...parsed.data,
    })

    invalidatePatientDetail({ nutritionistId, tenant: tenantSlug, patientId: parsed.data.patientId })

    if (parsed.data.careSessionId) {
      invalidateAfterCareSessionMutation({
        nutritionistId,
        tenant: tenantSlug,
        patientId: parsed.data.patientId,
        sessionId: parsed.data.careSessionId,
      })
    }

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Upload audio ─────────────────────────────────────────────────────────────

export async function uploadTranscriptionAudioAction(
  tenantSlug: string,
  transcriptionId: string,
  formData: FormData
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const audioFile = formData.get("audio")
    if (!(audioFile instanceof File)) {
      return { success: false, error: "No audio file provided." }
    }

    const consentForRecording = formData.get("consentForRecording") === "true"
    const consentForTranscription = formData.get("consentForTranscription") === "true"

    // Validate MIME type
    const allowedTypes = getAllowedMimeTypes()
    if (!allowedTypes.includes(audioFile.type)) {
      return {
        success: false,
        error: `File type "${audioFile.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      }
    }

    // Validate file size
    const maxSizeBytes = getMaxAudioSizeBytes()
    if (audioFile.size > maxSizeBytes) {
      const maxMb = maxSizeBytes / (1024 * 1024)
      return {
        success: false,
        error: `File exceeds the maximum size of ${maxMb} MB.`,
      }
    }

    // Verify transcription belongs to this nutritionist
    const existing = await getTranscription(transcriptionId, nutritionistId)
    if (!existing) {
      return { success: false, error: "Transcription not found." }
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { url, storageKey } = await uploadTranscriptionAudio(
      {
        buffer,
        fileName: audioFile.name,
        mimeType: audioFile.type,
        sizeBytes: audioFile.size,
      },
      nutritionistId,
      existing.patientId,
      session.userId
    )

    const updated = await setTranscriptionAudio(transcriptionId, nutritionistId, {
      url,
      storageKey,
      mimeType: audioFile.type,
      sizeBytes: audioFile.size,
    })

    // Update consent if provided
    if (consentForRecording || consentForTranscription) {
      const { prisma } = await import("@/lib/prisma")
      await prisma.consultationTranscription.update({
        where: { id: transcriptionId },
        data: {
          consentForRecording,
          consentForTranscription,
          consentCollectedAt: new Date(),
        },
      })
    }

    invalidatePatientDetail({ nutritionistId, tenant: tenantSlug, patientId: existing.patientId })

    return { success: true, transcription: updated }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Start processing ─────────────────────────────────────────────────────────

export async function startTranscriptionProcessingAction(
  tenantSlug: string,
  transcriptionId: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const transcription = await processTranscription(transcriptionId, nutritionistId)

    const existing = await getTranscription(transcriptionId, nutritionistId)
    if (existing) {
      invalidatePatientDetail({
        nutritionistId,
        tenant: tenantSlug,
        patientId: existing.patientId,
      })
      if (existing.careSessionId) {
        invalidateAfterCareSessionMutation({
          nutritionistId,
          tenant: tenantSlug,
          patientId: existing.patientId,
          sessionId: existing.careSessionId,
        })
      }
    }

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Update transcript text ───────────────────────────────────────────────────

export async function updateTranscriptionAction(
  tenantSlug: string,
  transcriptionId: string,
  data: {
    editedTranscript?: string
    clinicalSummary?: string
    patientFriendlySummary?: string
    title?: string
  }
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const parsed = updateTranscriptionSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
    }

    const transcription = await updateTranscriptionText(
      transcriptionId,
      nutritionistId,
      parsed.data
    )

    invalidatePatientDetail({
      nutritionistId,
      tenant: tenantSlug,
      patientId: transcription.patientId,
    })

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export async function approveTranscriptionAction(
  tenantSlug: string,
  transcriptionId: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const parsed = approveTranscriptionSchema.safeParse({ transcriptionId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
    }

    const transcription = await approveTranscription(transcriptionId, nutritionistId)

    invalidatePatientDetail({
      nutritionistId,
      tenant: tenantSlug,
      patientId: transcription.patientId,
    })

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectTranscriptionAction(
  tenantSlug: string,
  transcriptionId: string,
  reason?: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const parsed = rejectTranscriptionSchema.safeParse({ transcriptionId, reason })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
    }

    const transcription = await rejectTranscription(transcriptionId, nutritionistId, reason)

    invalidatePatientDetail({
      nutritionistId,
      tenant: tenantSlug,
      patientId: transcription.patientId,
    })

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Set visibility ───────────────────────────────────────────────────────────

export async function setTranscriptionVisibilityAction(
  tenantSlug: string,
  transcriptionId: string,
  visibility: TranscriptionVisibility
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const parsed = setTranscriptionVisibilitySchema.safeParse({ transcriptionId, visibility })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
    }

    const transcription = await setTranscriptionVisibility(
      transcriptionId,
      nutritionistId,
      visibility
    )

    invalidatePatientDetail({
      nutritionistId,
      tenant: tenantSlug,
      patientId: transcription.patientId,
    })

    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTranscriptionAction(
  tenantSlug: string,
  transcriptionId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId: transcriptionId })
    const ctx = await requirePermission("transcription", "delete", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const nutritionistId = ctx.nutritionistId

    const realtime = await prisma.appointmentTranscript.findFirst({
      where: { id: transcriptionId, tenantId: nutritionistId },
      select: {
        id: true,
        patientId: true,
        appointmentId: true,
        careSessionId: true,
        provider: true,
      },
    })
    if (realtime) {
      await deleteRealtimeTranscription(nutritionistId, transcriptionId)
      await recordRealtimeAudit(
        ctx,
        "transcription.session.delete",
        transcriptionId,
        { provider: realtime.provider, result: "deleted" },
        realtime.patientId,
        realtime.appointmentId
      )
      invalidatePatientDetail({
        nutritionistId,
        tenant: tenantSlug,
        patientId: realtime.patientId,
      })
      return { success: true }
    }

    // Fetch before deletion to get patientId for cache invalidation
    const existing = await getTranscription(transcriptionId, nutritionistId)
    if (!existing) {
      return { success: false, error: "Transcription not found." }
    }

    await deleteLegacyTranscription(transcriptionId, nutritionistId)

    invalidatePatientDetail({
      nutritionistId,
      tenant: tenantSlug,
      patientId: existing.patientId,
    })

    if (existing.careSessionId) {
      invalidateAfterCareSessionMutation({
        nutritionistId,
        tenant: tenantSlug,
        patientId: existing.patientId,
        sessionId: existing.careSessionId,
      })
    }

    return { success: true }
  } catch (error: unknown) {
    return safeRealtimeError(error)
  }
}

// ─── Fetch actions ────────────────────────────────────────────────────────────

export async function getTranscriptionAction(
  tenantSlug: string,
  transcriptionId: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const transcription = await getTranscription(transcriptionId, nutritionistId)
    return { success: true, transcription }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getPatientTranscriptionsAction(
  tenantSlug: string,
  patientId: string,
  opts?: { limit?: number; status?: string }
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const transcriptions = await getTranscriptionsByPatient(nutritionistId, patientId, {
      limit: opts?.limit,
      // The caller may pass a raw string; cast via the Prisma enum
      status: opts?.status as Parameters<typeof getTranscriptionsByPatient>[2] extends { status?: infer S } ? S : never,
    })

    return { success: true, transcriptions }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getCareSessionTranscriptionsAction(
  tenantSlug: string,
  careSessionId: string
) {
  try {
    const { session } = await assertTenantAccess(tenantSlug)
    const nutritionistId = session.nutritionistId

    const transcriptions = await getTranscriptionsByCareSession(nutritionistId, careSessionId)
    return { success: true, transcriptions }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ─── Realtime product transcription ─────────────────────────────────────────

type TranscriptionContext = Awaited<ReturnType<typeof requirePermission>>

function safeRealtimeError(error: unknown) {
  if (error instanceof TranscriptionDomainError) {
    return { success: false as const, error: error.message, code: error.code }
  }
  if (error instanceof AuthorizationError) {
    return { success: false as const, error: error.message, code: "FORBIDDEN" }
  }
  console.error("[REALTIME_TRANSCRIPTION_ACTION]", error)
  return {
    success: false as const,
    error: "Não foi possível concluir a operação de transcrição.",
    code: "INTERNAL_ERROR",
  }
}

function assertCanAccessTranscriptContent(ctx: TranscriptionContext) {
  if (ctx.isGlobalAdmin) {
    throw new AuthorizationError(
      "A Administração Global não pode acessar conteúdo de transcrição."
    )
  }
}

async function recordRealtimeAudit(
  ctx: TranscriptionContext,
  action: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
  patientId?: string | null,
  appointmentId?: string | null
) {
  await auditLogService.record({
    tenantId: ctx.nutritionistId,
    actor: {
      userId: ctx.userId,
      teamMemberId: ctx.teamMemberId,
      name: ctx.nutritionist.name,
      role: ctx.role,
    },
    action,
    resource: "transcription",
    resourceId,
    patientId,
    appointmentId,
    metadata,
  })
}

async function assertTranscriptionPlanAccess(
  tenantId: string,
  mode: "online" | "in_person"
) {
  await requireFeature(
    tenantId,
    mode === "online"
      ? "transcription.online.enabled"
      : "transcription.inPerson.enabled"
  )
  const subscription = await getTenantSubscriptionContext(tenantId)
  const limit = subscription.featureLimits["transcription.minutes.monthly"]?.limit
  if (limit == null) return
  const current = await prisma.transcriptionUsageCounter.aggregate({
    where: {
      tenantId,
      yearMonth: new Date().toISOString().slice(0, 7),
    },
    _sum: { minutesTranscribed: true },
  })
  if ((current._sum.minutesTranscribed ?? 0) >= limit) {
    throw new TranscriptionDomainError(
      "PLAN_LIMIT_REACHED",
      "O limite mensal de transcrição do plano foi atingido."
    )
  }
}

export async function startAutomaticTranscriptionAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = startAutomaticTranscriptionSchema.parse(input)
    const ctx = await requirePermission("transcription", "start", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    await assertTranscriptionPlanAccess(ctx.nutritionistId, parsed.mode)
    const created = await createTranscriptionSession(ctx.nutritionistId, parsed)
    const transcript = await startTranscriptionSession(ctx.nutritionistId, created.id)
    await recordRealtimeAudit(
      ctx,
      parsed.autoStarted
        ? "transcription.session.auto_start"
        : "transcription.session.start",
      transcript.id,
      {
        provider: transcript.provider,
        model: transcript.model,
        language: transcript.language,
        autoStarted: transcript.autoStarted,
        source: parsed.mode,
      },
      transcript.patientId,
      transcript.appointmentId
    )
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function pauseTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "pause", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await pauseTranscriptionSession(ctx.nutritionistId, transcriptId)
    await recordRealtimeAudit(ctx, "transcription.session.pause", transcriptId, {
      provider: transcript.provider,
    }, transcript.patientId, transcript.appointmentId)
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function resumeTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "resume", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await resumeTranscriptionSession(ctx.nutritionistId, transcriptId)
    await recordRealtimeAudit(ctx, "transcription.session.resume", transcriptId, {
      provider: transcript.provider,
    }, transcript.patientId, transcript.appointmentId)
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function stopTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "stop", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await stopTranscriptionSession(ctx.nutritionistId, transcriptId)
    await recordRealtimeAudit(ctx, "transcription.session.stop", transcriptId, {
      provider: transcript.provider,
      segmentCount: transcript.segmentCount,
      durationSeconds: transcript.durationSeconds,
    }, transcript.patientId, transcript.appointmentId)
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function saveTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "save", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await finalizeTranscriptionSession(
      ctx.nutritionistId,
      transcriptId,
      ctx.userId
    )
    await recordRealtimeAudit(ctx, "transcription.session.save", transcriptId, {
      provider: transcript.provider,
      model: transcript.model,
      segmentCount: transcript.segmentCount,
      durationSeconds: transcript.durationSeconds,
    }, transcript.patientId, transcript.appointmentId)
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function discardTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "discard", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await discardTranscriptionSession(ctx.nutritionistId, transcriptId)
    await recordRealtimeAudit(ctx, "transcription.session.discard", transcriptId, {
      provider: transcript.provider,
      result: "discarded",
    }, transcript.patientId, transcript.appointmentId)
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function appendFinalTranscriptSegmentAction(
  tenantSlug: string,
  transcriptId: string,
  input: unknown
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const segment = finalTranscriptSegmentSchema.parse(input)
    const ctx = await requirePermission("transcription", "save", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const result = await appendFinalTranscriptSegments(
      ctx.nutritionistId,
      transcriptId,
      [segment]
    )
    if (result.inserted > 0) {
      await recordRealtimeAudit(ctx, "transcription.segment.persist", transcriptId, {
        segmentCount: result.inserted,
      })
    }
    return { success: true as const, ...result }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function bulkAppendFinalTranscriptSegmentsAction(
  tenantSlug: string,
  transcriptId: string,
  input: unknown
) {
  try {
    const parsed = bulkFinalTranscriptSegmentsSchema.parse({
      transcriptId,
      segments: input,
    })
    const ctx = await requirePermission("transcription", "save", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const result = await appendFinalTranscriptSegments(
      ctx.nutritionistId,
      transcriptId,
      parsed.segments
    )
    if (result.inserted > 0) {
      await recordRealtimeAudit(ctx, "transcription.segment.persist", transcriptId, {
        segmentCount: result.inserted,
      })
    }
    return { success: true as const, ...result }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function attachTranscriptionToMedicalRecordAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = attachTranscriptionToMedicalRecordSchema.parse(input)
    const ctx = await requirePermission(
      "transcription",
      "attachToMedicalRecord",
      tenantSlug,
      { throwOnFailure: true }
    )
    assertCanAccessTranscriptContent(ctx)
    await requireFeature(ctx.nutritionistId, "transcription.attach.enabled")
    const transcript = await getTranscriptionSession(
      ctx.nutritionistId,
      parsed.transcriptId
    )
    const note = await attachTranscriptionToMedicalRecord(
      ctx.nutritionistId,
      parsed.transcriptId,
      parsed.reviewedText
    )
    await recordRealtimeAudit(
      ctx,
      "transcription.attach_to_medical_record",
      parsed.transcriptId,
      { result: "attached" },
      transcript.patientId,
      transcript.appointmentId
    )
    return { success: true as const, noteId: note.id }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function exportRealtimeTranscriptionAction(
  tenantSlug: string,
  transcriptId: string
) {
  try {
    transcriptIdSchema.parse({ transcriptId })
    const ctx = await requirePermission("transcription", "export", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    await requireFeature(ctx.nutritionistId, "transcription.export.enabled")
    const transcript = await getTranscriptionSession(
      ctx.nutritionistId,
      transcriptId
    )
    const text = transcript.segments
      .map((segment) => {
        const speaker = segment.speakerNameSnapshot
          ? `${segment.speakerNameSnapshot}: `
          : ""
        return `${speaker}${segment.text}`
      })
      .join("\n\n")
    await recordRealtimeAudit(
      ctx,
      "transcription.session.export",
      transcriptId,
      {
        provider: transcript.provider,
        model: transcript.model,
        segmentCount: transcript.segmentCount,
      },
      transcript.patientId,
      transcript.appointmentId
    )
    return {
      success: true as const,
      text,
      filename: `transcription-${transcriptId}.txt`,
    }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function updateTranscriptionSettingsAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = updateTranscriptionSettingsSchema.parse(input)
    const ctx = await requirePermission(
      "transcription.settings",
      "edit",
      tenantSlug,
      { throwOnFailure: true }
    )
    const settings = await updateTranscriptionSettings(ctx.nutritionistId, parsed)
    await recordRealtimeAudit(ctx, "transcription.settings.update", settings.id, {
      provider: settings.provider,
      model: settings.model,
      language: settings.language,
      result: "updated",
    })
    return { success: true as const, settings }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function testTranscriptionProviderAction(tenantSlug: string) {
  try {
    const ctx = await requirePermission(
      "transcription.provider",
      "test",
      tenantSlug,
      { throwOnFailure: true }
    )
    const settings = await getTranscriptionSettings(ctx.nutritionistId)
    const status = await getTranscriptionProviderStatus(settings)
    await recordRealtimeAudit(ctx, "transcription.provider.test", settings.id, {
      provider: status.provider,
      model: status.model,
      result: status.online ? "online" : "offline",
      providerLatencyMs: status.latencyMs,
    })
    return { success: true as const, status }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function getTranscriptionSettingsAction(tenantSlug: string) {
  try {
    const ctx = await requirePermission(
      "transcription.settings",
      "view",
      tenantSlug,
      { throwOnFailure: true }
    )
    const settings = await getTranscriptionSettings(ctx.nutritionistId)
    const providerStatus = await getTranscriptionProviderStatus(settings)
    return { success: true as const, settings, providerStatus }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function getActiveTranscriptionSessionAction(
  tenantSlug: string,
  careSessionId: string
) {
  try {
    const ctx = await requirePermission("transcription", "view", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const transcript = await getActiveTranscriptionSession(
      ctx.nutritionistId,
      careSessionId
    )
    return { success: true as const, transcript }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function updateTranscriptionParticipantAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = updateTranscriptParticipantSchema.parse(input)
    const ctx = await requirePermission("transcription", "start", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const participant = await updateTranscriptionParticipant(
      ctx.nutritionistId,
      parsed
    )
    return { success: true as const, participant }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function updateTranscriptSegmentSpeakerAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = updateTranscriptSegmentSpeakerSchema.parse(input)
    const ctx = await requirePermission("transcription", "save", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const segment = await updateTranscriptSegmentSpeaker(
      ctx.nutritionistId,
      parsed
    )
    await recordRealtimeAudit(
      ctx,
      "transcription.segment.speaker_update",
      parsed.transcriptId,
      { source: parsed.source, segmentCount: 1 }
    )
    return { success: true as const, segment }
  } catch (error) {
    return safeRealtimeError(error)
  }
}

export async function createTranscriptionSessionTokenAction(
  tenantSlug: string,
  input: unknown
) {
  try {
    const parsed = createTranscriptionTokenSchema.parse(input)
    const ctx = await requirePermission("transcription", "start", tenantSlug, {
      throwOnFailure: true,
    })
    assertCanAccessTranscriptContent(ctx)
    const connection = await createTranscriptionSessionToken(
      ctx.nutritionistId,
      parsed.transcriptId,
      parsed.participantId
    )
    return { success: true as const, connection }
  } catch (error) {
    return safeRealtimeError(error)
  }
}
