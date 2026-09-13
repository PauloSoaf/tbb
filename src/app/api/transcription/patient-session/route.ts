import { z } from "zod";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { prisma } from "@/lib/prisma";
import { validatePatientJoinToken } from "@/services/care-session-link.service";
import {
  appendFinalTranscriptSegments,
  createTranscriptionSessionToken,
  updateTranscriptionParticipant,
} from "@/services/transcription/transcription-session.service";
import { finalTranscriptSegmentSchema } from "@/validation/transcription.schema";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    careSessionId: z.string().cuid(),
    transcriptId: z.string().cuid(),
    joinToken: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("segments"),
    careSessionId: z.string().cuid(),
    transcriptId: z.string().cuid(),
    joinToken: z.string().min(1).optional(),
    segments: z.array(finalTranscriptSegmentSchema).min(1).max(100),
  }),
  z.object({
    action: z.literal("status"),
    careSessionId: z.string().cuid(),
    transcriptId: z.string().cuid(),
    joinToken: z.string().min(1).optional(),
    audioState: z.enum([
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
  }),
]);

async function resolvePatientAccess(careSessionId: string, joinToken?: string | null) {
  if (joinToken) {
    const validated = await validatePatientJoinToken(careSessionId, joinToken);
    if (validated.valid && validated.session) {
      return {
        tenantId: validated.session.nutritionistId,
        patientId: validated.session.patientId,
        patientName: validated.session.patient.name,
      };
    }
  }

  const session = await getPatientSessionFromCookies();
  if (!session) return null;
  const careSession = await prisma.careSession.findFirst({
    where: {
      id: careSessionId,
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
    },
    select: { patient: { select: { id: true, name: true } } },
  });
  if (!careSession) return null;
  return {
    tenantId: session.nutritionistId,
    patientId: careSession.patient.id,
    patientName: careSession.patient.name,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const careSessionId = url.searchParams.get("careSessionId");
  const joinToken = url.searchParams.get("joinToken");
  if (!careSessionId) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const access = await resolvePatientAccess(careSessionId, joinToken);
  if (!access) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [settings, transcript] = await Promise.all([
    prisma.transcriptionSettings.findUnique({ where: { tenantId: access.tenantId } }),
    prisma.appointmentTranscript.findFirst({
      where: {
        tenantId: access.tenantId,
        careSessionId,
        patientId: access.patientId,
        status: { in: ["LIVE", "PAUSED", "RECORDING"] },
      },
      select: {
        id: true,
        status: true,
        provider: true,
        model: true,
        language: true,
        sampleRate: true,
        chunkMs: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return Response.json({
    active: Boolean(transcript),
    noticeRequired: settings?.requirePatientNotice ?? true,
    transcript,
  });
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.parse(await request.json());
    const access = await resolvePatientAccess(parsed.careSessionId, parsed.joinToken);
    if (!access) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const transcript = await prisma.appointmentTranscript.findFirst({
      where: {
        id: parsed.transcriptId,
        tenantId: access.tenantId,
        careSessionId: parsed.careSessionId,
        patientId: access.patientId,
        status: { in: ["LIVE", "PAUSED", "RECORDING"] },
      },
      select: { id: true, appointmentId: true },
    });
    if (!transcript) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    const participantId = `patient:${access.patientId}`;

    if (parsed.action === "connect") {
      const existingParticipant =
        await prisma.appointmentTranscriptParticipant.findUnique({
          where: {
            transcriptId_participantId: {
              transcriptId: parsed.transcriptId,
              participantId,
            },
          },
        });
      await updateTranscriptionParticipant(access.tenantId, {
        transcriptId: parsed.transcriptId,
        participantId,
        speakerPatientId: access.patientId,
        speakerNameSnapshot: access.patientName,
        source: "PATIENT",
        audioState: "capturing",
        noticeAcknowledged: true,
      });
      if (!existingParticipant?.noticeAcknowledgedAt) {
        await prisma.consentRecord.create({
          data: {
            tenantId: access.tenantId,
            patientId: access.patientId,
            consentType: "ONLINE_TRANSCRIPTION_NOTICE",
            status: "GRANTED",
            version: "realtime-transcription-v1",
            textSnapshot: "Paciente informado sobre a transcrição do atendimento.",
            source: "PATIENT_PORTAL",
            metadata: {
              transcriptId: parsed.transcriptId,
              appointmentId: transcript.appointmentId,
            },
          },
        });
      }
      const connection = await createTranscriptionSessionToken(
        access.tenantId,
        parsed.transcriptId,
        participantId
      );
      return Response.json({ success: true, connection, participantId });
    }

    if (parsed.action === "status") {
      await updateTranscriptionParticipant(access.tenantId, {
        transcriptId: parsed.transcriptId,
        participantId,
        speakerPatientId: access.patientId,
        speakerNameSnapshot: access.patientName,
        source: "PATIENT",
        audioState: parsed.audioState,
      });
      return Response.json({ success: true });
    }

    const result = await appendFinalTranscriptSegments(
      access.tenantId,
      parsed.transcriptId,
      parsed.segments.map((segment) => ({
        ...segment,
        participantId,
        speakerPatientId: access.patientId,
        speakerNameSnapshot: access.patientName,
        speakerRoleSnapshot: "PATIENT",
        source: "PATIENT",
      }))
    );
    return Response.json({ success: true, ...result });
  } catch {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
}
