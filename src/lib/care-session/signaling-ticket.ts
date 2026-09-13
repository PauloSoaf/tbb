// Short-lived signed ticket used to authenticate the WebSocket handshake
// with the DEDICATED signaling server (scripts/signaling-server.ts).
//
// WHY THIS EXISTS: session cookies (`nutriopus-session` / `nutriopus-patient-
// session`) are host-only — the browser sends them ONLY to the exact host
// that set them (www.nutriopus.com). In production the WebSocket server runs
// on a different host (Railway/Render/Fly/subdomain), so the cookie never
// reaches it. Relying on cookies works only in local dev, where the browser
// happens to send them cross-port on localhost.
//
// The ticket is fetched via a normal same-origin POST (cookies work fine
// there) right before opening the socket, then passed as `?ticket=` in the
// WS URL — which travels to ANY host, unlike cookies.
import { SignJWT, jwtVerify } from "jose";
import type { CareSessionParticipantRole } from "@/components/care-session/native/signaling/types";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
const ISSUER = "nutriopus-signaling";
const AUDIENCE = "nutriopus-ws";
const TICKET_TTL_SECONDS = 60; // short-lived: only needs to survive the handshake

export interface SignalingTicketPayload {
  sessionId: string;
  role: CareSessionParticipantRole;
  nutritionistId: string;
  patientId: string | null;
}

export async function createSignalingTicket(payload: SignalingTicketPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${TICKET_TTL_SECONDS}s`)
    .sign(SECRET_KEY);
}

export async function verifySignalingTicket(token: string): Promise<SignalingTicketPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { issuer: ISSUER, audience: AUDIENCE });
    return payload as unknown as SignalingTicketPayload;
  } catch {
    return null;
  }
}
