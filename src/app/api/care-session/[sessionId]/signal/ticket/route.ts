import { NextRequest, NextResponse } from "next/server";
import { NO_STORE_HEADERS, resolveCallerWithSession } from "@/lib/care-session/signaling-server";
import { createSignalingTicket } from "@/lib/care-session/signaling-ticket";

// Issues a short-lived signal ticket for the WebSocket handshake.
// Called same-origin (cookies work normally here); the ticket then travels
// with the WS connection to whatever host runs the signaling server — see
// src/lib/care-session/signaling-ticket.ts for why this exists.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  let body: { patientJoinToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — nutritionist/patient-cookie callers send none
  }

  const caller = await resolveCallerWithSession(sessionId, body.patientJoinToken);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const ticket = await createSignalingTicket({
    sessionId,
    role: caller.role,
    nutritionistId: caller.nutritionistId,
    patientId: caller.patientId,
  });

  return NextResponse.json({ ticket }, { headers: NO_STORE_HEADERS });
}
