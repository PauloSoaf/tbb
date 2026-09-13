// ─── Care-session signaling: shared types & pure helpers ─────────────────────
// The signaling layer is transport-agnostic: SSE (default), WebSocket
// (optional, requires a dedicated server) and HTTP polling (emergency
// fallback). WebRTC code must depend on these types only — never on a
// concrete transport.

export type CareSessionSignalType =
  | "presence"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "media-state"
  | "screen-share-started"
  | "screen-share-stopped"
  | "hangup"
  | "heartbeat";

export type CareSessionParticipantRole = "NUTRITIONIST" | "PATIENT";

export type CareSessionSignal = {
  id: string;
  sessionId: string;
  type: CareSessionSignalType;
  senderRole: CareSessionParticipantRole;
  targetRole?: CareSessionParticipantRole;
  payload: unknown;
  createdAt: string;
};

export type MediaStatePayload = {
  cameraOn: boolean;
  micOn: boolean;
  screenSharing: boolean;
};

export type PresencePayload = {
  status: "joined" | "left" | "reconnecting" | "heartbeat";
};

export type SignalingTransport = "sse" | "websocket" | "polling";

export type SignalingStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type OutgoingSignal = Omit<CareSessionSignal, "id" | "createdAt" | "sessionId">;

export type SignalingChannelCallbacks = {
  onSignal: (signal: CareSessionSignal) => void;
  onStatusChange: (status: SignalingStatus) => void;
};

/** Low-level receive channel implemented by each transport (non-hook factory). */
export type SignalingChannel = {
  transport: SignalingTransport;
  start: () => void;
  stop: () => void;
};

export const CARE_SESSION_SIGNAL_TYPES: readonly CareSessionSignalType[] = [
  "presence",
  "offer",
  "answer",
  "ice-candidate",
  "media-state",
  "screen-share-started",
  "screen-share-stopped",
  "hangup",
  "heartbeat",
] as const;

export function isCareSessionSignalType(value: unknown): value is CareSessionSignalType {
  return typeof value === "string" &&
    (CARE_SESSION_SIGNAL_TYPES as readonly string[]).includes(value);
}

export function isParticipantRole(value: unknown): value is CareSessionParticipantRole {
  return value === "NUTRITIONIST" || value === "PATIENT";
}

export function isMediaStatePayload(value: unknown): value is MediaStatePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.cameraOn === "boolean" &&
    typeof v.micOn === "boolean" &&
    typeof v.screenSharing === "boolean"
  );
}

export function isPresencePayload(value: unknown): value is PresencePayload {
  if (typeof value !== "object" || value === null) return false;
  const status = (value as Record<string, unknown>).status;
  return status === "joined" || status === "left" || status === "reconnecting" || status === "heartbeat";
}

/** Parses a raw JSON object (from SSE/WS/polling) into a CareSessionSignal, or null. */
export function parseCareSessionSignal(raw: unknown): CareSessionSignal | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !isCareSessionSignalType(r.type) || !isParticipantRole(r.senderRole)) {
    return null;
  }
  return {
    id: r.id,
    sessionId: typeof r.sessionId === "string" ? r.sessionId : "",
    type: r.type,
    senderRole: r.senderRole,
    targetRole: isParticipantRole(r.targetRole) ? r.targetRole : undefined,
    payload: r.payload ?? null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(0).toISOString(),
  };
}

/**
 * Deterministic ordering: createdAt first, id as tie-breaker so two signals
 * persisted in the same millisecond never swap or get lost by a cursor.
 */
export function compareSignals(a: Pick<CareSessionSignal, "createdAt" | "id">, b: Pick<CareSessionSignal, "createdAt" | "id">): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function supportsSSE(): boolean {
  return typeof window !== "undefined" && typeof window.EventSource === "function";
}

export function supportsWebSocket(): boolean {
  return typeof window !== "undefined" && typeof window.WebSocket === "function";
}

/**
 * Resolves the configured transport.
 *
 * DEFAULT = polling. This is deliberate: SSE streaming is unreliable under
 * `next dev` (the dev server buffers streamed responses and holds the
 * persistent connection, so events arrive very late or never). Polling works
 * identically on `next dev`, `next start` and serverless.
 *
 * Opt in to lower latency via NEXT_PUBLIC_SIGNALING_TRANSPORT:
 *   - "sse"       → real-time push, best on `next start`/self-host (not dev)
 *   - "websocket" → true real-time, needs the dedicated server + WS URL
 * See docs/CARE_SESSION_SIGNALING_SSE.md / _WEBSOCKET.md.
 */
export function resolveSignalingTransport(
  requested?: SignalingTransport,
  env: { transport?: string; wsUrl?: string } = {
    transport: process.env.NEXT_PUBLIC_SIGNALING_TRANSPORT,
    wsUrl: process.env.NEXT_PUBLIC_SIGNALING_WS_URL,
  }
): SignalingTransport {
  const wanted = requested ?? (env.transport as SignalingTransport | undefined) ?? "polling";
  if (wanted === "websocket") {
    if (env.wsUrl && supportsWebSocket()) return "websocket";
    return supportsSSE() ? "sse" : "polling";
  }
  if (wanted === "sse") return supportsSSE() ? "sse" : "polling";
  return "polling";
}
