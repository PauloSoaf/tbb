import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  NO_STORE_HEADERS,
  fetchSignalsForCaller,
  resolveCallerWithSession,
  serializeSignal,
} from "@/lib/care-session/signaling-server";
import {
  isCareSessionSignalType,
  isParticipantRole,
} from "@/components/care-session/native/signaling/types";

// Signaling is LIVE state: offer/answer/ICE/presence/media-state must NEVER
// be cached by the Router Cache, Data Cache, CDN or any proxy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

// GET — polling FALLBACK only (the default receive path is the SSE stream at
// ./stream). Returns signals sent by the OTHER participant, after the cursor.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const patientJoinToken = req.nextUrl.searchParams.get("token");
  const caller = await resolveCallerWithSession(sessionId, patientJoinToken);
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const since = req.nextUrl.searchParams.get("since") ?? new Date(0).toISOString();
  const afterId = req.nextUrl.searchParams.get("afterId") ?? "";

  const signals = await fetchSignalsForCaller(sessionId, caller, since, afterId);

  return json({ signals: signals.map(serializeSignal) });
}

// POST — send a signal (offer/answer/ice-candidate/media-state/presence/
// screen-share-*/hangup/heartbeat). This is the ONLY send path for the SSE
// and polling transports.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const patientJoinToken = typeof body.authToken === "string" ? body.authToken : null;
  const caller = await resolveCallerWithSession(sessionId, patientJoinToken);
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const { type, payload, senderRole, targetRole } = body;

  if (!isCareSessionSignalType(type)) {
    return json({ error: "Invalid signal type" }, 400);
  }
  if (!isParticipantRole(senderRole)) {
    return json({ error: "Invalid senderRole" }, 400);
  }
  // A patient can only act as PATIENT; a nutritionist only as NUTRITIONIST.
  // (Never trust nutritionistId/role coming from the client.)
  if (senderRole !== caller.role) {
    return json({ error: "senderRole does not match authenticated caller" }, 403);
  }
  if (targetRole !== undefined && !isParticipantRole(targetRole)) {
    return json({ error: "Invalid targetRole" }, 400);
  }
  if (payload === undefined) {
    return json({ error: "Missing payload" }, 400);
  }

  const signal = await prisma.careSessionSignal.create({
    data: {
      careSessionId: sessionId,
      nutritionistId: caller.nutritionistId,
      senderRole: caller.role,
      type,
      payload: (payload ?? {}) as Prisma.InputJsonValue,
    },
  });

  return json({ signal: serializeSignal(signal) });
}
