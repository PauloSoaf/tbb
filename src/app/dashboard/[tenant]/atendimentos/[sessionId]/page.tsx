import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getCareSession } from "@/services/care-session.service";
import { getLatestPatientMeasurement } from "@/services/patient-measurement.service";
import { getTranscriptionsByCareSession } from "@/services/transcription/transcription.service";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CareSessionPageClient } from "@/components/care-session/CareSessionPageClient";
import { getTranscriptionSettings } from "@/services/transcription/transcription-session.service";

interface Props {
  params: Promise<{ tenant: string; sessionId: string }>;
}

export default async function CareSessionPage({ params }: Props) {
  const { tenant, sessionId } = await params;
  const access = await assertTenantAccess(tenant);
  const { session } = access;
  const careSession = await getCareSession(session.nutritionistId, sessionId);
  if (!careSession) notFound();
  const canTranscribe =
    access.isOwner ||
    access.permissions.has("transcription.view") ||
    access.permissions.has("transcription.start");

  const [transcriptions, latestAnamnese, latestMeasurement, transcriptionSettings, realtimeTranscript] = await Promise.all([
    getTranscriptionsByCareSession(session.nutritionistId, sessionId),
    prisma.anamneseResponse.findFirst({
      where: { nutritionistId: session.nutritionistId, patientId: careSession.patientId },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, submittedAt: true },
    }),
    getLatestPatientMeasurement(session.nutritionistId, careSession.patientId),
    canTranscribe ? getTranscriptionSettings(session.nutritionistId) : null,
    canTranscribe
      ? prisma.appointmentTranscript.findFirst({
          where: { tenantId: session.nutritionistId, careSessionId: sessionId },
          include: {
            segments: { orderBy: [{ startedAtMs: "asc" }, { createdAt: "asc" }] },
            participants: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : null,
  ]);

  return (
    <CareSessionPageClient
      tenant={tenant}
      careSession={careSession}
      customTitle={careSession.title ?? null}
      initialTranscriptions={JSON.parse(JSON.stringify(transcriptions))}
      transcriptionSettings={
        transcriptionSettings ? JSON.parse(JSON.stringify(transcriptionSettings)) : null
      }
      initialRealtimeTranscript={
        realtimeTranscript ? JSON.parse(JSON.stringify(realtimeTranscript)) : null
      }
      latestAnamnese={
        latestAnamnese
          ? {
              id: latestAnamnese.id,
              status: latestAnamnese.status,
              submittedAt: latestAnamnese.submittedAt.toISOString(),
            }
          : null
      }
      latestMeasurement={
        latestMeasurement
          ? {
              id: latestMeasurement.id,
              measuredAt: latestMeasurement.measuredAt.toISOString(),
              weight: latestMeasurement.weight,
              bmi: latestMeasurement.bmi,
              bodyFatPercentage: latestMeasurement.bodyFatPercentage,
            }
          : null
      }
    />
  );
}
