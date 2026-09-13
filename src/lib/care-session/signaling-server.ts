// Server-side helpers shared by the care-session signaling routes
// (POST/GET /signal and the SSE GET /signal/stream).
//
// Signaling is LIVE state: offer/answer/ICE/presence/media-state/hangup must
// NEVER be cached (Router Cache, Data Cache, CDN or proxies).

import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import crypto from "crypto";
import type { CareSession, CareSessionSignal, Prisma } from "@prisma/client";
import type { CareSessionParticipantRole } from "@/components/care-session/native/signaling/types";

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export interface CallerIdentity {
  nutritionistId: string;
  patientId: string | null; // null means caller is the nutritionist
  role: CareSessionParticipantRole;
  careSession: CareSession;
}

// Resolves who is calling and validates access to the care session.
// Nutritionist session takes priority, but if the nutritionist session
// doesn't match this care session (different account), we fall back to
// the patient session. This handles the case where a developer/tester
// has both nutritionist and patient cookies in the same browser.
// The role is ALWAYS derived server-side — never trusted from the client.
async function resolvePatientJoinToken(sessionId: string, token?: string | null): Promise<CallerIdentity | null> {
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const cs = await prisma.careSession.findUnique({ where: { id: sessionId } });
  if (!cs || !cs.patientJoinTokenHash || !cs.patientJoinTokenExpiresAt) return null;
  if (cs.patientJoinTokenHash !== tokenHash) return null;
  if (new Date() > cs.patientJoinTokenExpiresAt) return null;

  return {
    nutritionistId: cs.nutritionistId,
    patientId: cs.patientId,
    role: "PATIENT",
    careSession: cs,
  };
}

export async function resolveCallerWithSession(
  sessionId: string,
  patientJoinToken?: string | null
): Promise<CallerIdentity | null> {
  const tokenCaller = await resolvePatientJoinToken(sessionId, patientJoinToken);
  if (tokenCaller) return tokenCaller;

  const nutriSession = await getSessionFromCookies();
  if (nutriSession) {
    const cs = await prisma.careSession.findFirst({
      where: { id: sessionId, nutritionistId: nutriSession.nutritionistId },
    });
    if (cs) {
      return {
        nutritionistId: nutriSession.nutritionistId,
        patientId: null,
        role: "NUTRITIONIST",
        careSession: cs,
      };
    }
  }

  // Nutritionist session was absent or didn't match — try patient session
  const patientSession = await getPatientSessionFromCookies();
  if (patientSession) {
    const cs = await prisma.careSession.findFirst({
      where: {
        id: sessionId,
        nutritionistId: patientSession.nutritionistId,
        patientId: patientSession.patientId,
      },
    });
    if (cs) {
      return {
        nutritionistId: patientSession.nutritionistId,
        patientId: patientSession.patientId,
        role: "PATIENT",
        careSession: cs,
      };
    }
  }

  return null;
}

/**
 * Deterministic cursor filter: createdAt strictly after the cursor, or same
 * createdAt with a larger id — so two signals persisted in the same
 * millisecond are never skipped or duplicated by the cursor.
 */
export function buildCursorWhere(since: string, afterId: string): Prisma.CareSessionSignalWhereInput {
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) {
    return { createdAt: { gt: new Date(0) } };
  }
  if (!afterId) return { createdAt: { gt: sinceDate } };
  return {
    OR: [
      { createdAt: { gt: sinceDate } },
      { AND: [{ createdAt: sinceDate }, { id: { gt: afterId } }] },
    ],
  };
}

/** Wire format sent to clients (SSE `signal` events and polling JSON). */
export function serializeSignal(s: CareSessionSignal) {
  return {
    id: s.id,
    sessionId: s.careSessionId,
    type: s.type,
    senderRole: s.senderRole,
    payload: s.payload,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Fetches signals sent by the OTHER participant after the cursor, in deterministic order. */
export async function fetchSignalsForCaller(
  sessionId: string,
  caller: CallerIdentity,
  since: string,
  afterId: string,
  take = 100
) {
  return prisma.careSessionSignal.findMany({
    where: {
      careSessionId: sessionId,
      nutritionistId: caller.nutritionistId,
      senderRole: caller.role === "NUTRITIONIST" ? "PATIENT" : "NUTRITIONIST",
      ...buildCursorWhere(since, afterId),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
  });
}
