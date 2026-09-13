import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect, notFound } from "next/navigation";
import { getPatientCareSessions } from "@/services/care-session.service";
import { validatePatientJoinToken } from "@/services/care-session-link.service";
import { CareSessionRoom, CareSessionData } from "@/components/care-session/CareSessionRoom";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ tenant: string; sessionId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PortalCareSessionPage({ params, searchParams }: Props) {
  const { tenant, sessionId } = await params;
  const { token } = await searchParams;

  let validSession = null;
  let patientName = "Você";
  let patientId = "";

  if (token) {
    const { valid, session } = await validatePatientJoinToken(sessionId, token);
    if (valid && session) {
      validSession = session;
      patientName = session.patient.name;
      patientId = session.patientId;
    }
  }

  if (!validSession) {
    const ps = await getPatientSessionFromCookies();
    if (!ps || ps.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

    const sessions = await getPatientCareSessions(ps.patientId, ps.nutritionistId);
    const careSession = sessions.find((s) => s.id === sessionId);
    if (!careSession) notFound();
    validSession = careSession;
    patientId = ps.patientId;
  }

  if (!validSession) notFound();
  const activeTranscription = await prisma.appointmentTranscript.findFirst({
    where: {
      tenantId: validSession.nutritionistId,
      careSessionId: sessionId,
      status: { in: ["LIVE", "PAUSED", "RECORDING"] },
    },
    select: { id: true },
  });

  // If we loaded the session via getPatientCareSessions, we might not have attachments etc. but CareSessionRoom type is satisfied
  // Actually getPatientCareSessions doesn't include patient JoinToken fields, but we don't need them in the Patient view.

  return (
    <div>
      <div className="px-4 pt-4 lg:px-8 lg:pt-8">
        <h1 className="text-xl font-bold text-text-primary">
          {validSession.title ?? "Consulta online"}
        </h1>
      </div>
      <CareSessionRoom
        tenantSlug={tenant}
        patientJoinToken={token ?? null}
        careSession={{
          ...validSession,
          patientJoinTokenHash: null,
          patientId: patientId,
          patient: { id: patientId, name: patientName },
        } as unknown as CareSessionData}
        role="PATIENT"
        patientTranscriptionActive={Boolean(activeTranscription)}
      />
    </div>
  );
}
