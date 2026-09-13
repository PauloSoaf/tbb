"use client";
// SSE receive channel (default transport).
// The client NEVER polls: it keeps one EventSource open on
// GET /api/care-session/[sessionId]/signal/stream and receives `signal`
// events pushed by the server. Sending is always done via POST.
//
// Implemented as a non-hook factory so the orchestrator hook
// (useCareSessionSignaling) can swap transports at runtime without
// violating the rules of hooks.

import {
  parseCareSessionSignal,
  supportsSSE,
  type CareSessionParticipantRole,
  type SignalingChannel,
  type SignalingChannelCallbacks,
} from "./types";

const MAX_RECONNECT_DELAY_MS = 15_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

export type CreateSseChannelInput = SignalingChannelCallbacks & {
  sessionId: string;
  role: CareSessionParticipantRole;
  patientJoinToken?: string | null;
  /** Called when SSE keeps failing and the caller should fall back to polling. */
  onFatalError?: () => void;
  /** Give up and report fatal error after this many consecutive failures. */
  maxConsecutiveFailures?: number;
};

export function createSseSignalingChannel({
  sessionId,
  role,
  patientJoinToken,
  onSignal,
  onStatusChange,
  onFatalError,
  maxConsecutiveFailures = 4,
}: CreateSseChannelInput): SignalingChannel {
  let source: EventSource | null = null;
  let stopped = false;
  let failures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  // Cursor of the last signal actually received — on reconnect we resume from
  // here so no signal is lost during the gap.
  let cursor: { createdAt: string; id: string } | null = null;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    if (stopped) return;
    if (!supportsSSE()) {
      onStatusChange("error");
      onFatalError?.();
      return;
    }

    onStatusChange(failures === 0 ? "connecting" : "reconnecting");

    const params = new URLSearchParams({ role });
    if (patientJoinToken) params.set("token", patientJoinToken);
    if (cursor) {
      params.set("after", cursor.createdAt);
      params.set("afterId", cursor.id);
    }
    source = new EventSource(`/api/care-session/${sessionId}/signal/stream?${params.toString()}`);

    source.addEventListener("open", () => {
      failures = 0;
      onStatusChange("connected");
    });

    source.addEventListener("signal", (event) => {
      try {
        const signal = parseCareSessionSignal(JSON.parse((event as MessageEvent).data));
        if (!signal) return;
        cursor = { createdAt: signal.createdAt, id: signal.id };
        onSignal(signal);
      } catch {
        // malformed event — never break the stream because of one bad signal
      }
    });

    source.addEventListener("heartbeat", () => {
      // Server heartbeat keeps intermediaries from closing the stream.
      failures = 0;
    });

    source.addEventListener("error", () => {
      source?.close();
      source = null;
      if (stopped) return;
      failures += 1;
      if (failures >= maxConsecutiveFailures) {
        onStatusChange("error");
        onFatalError?.();
        return;
      }
      onStatusChange("reconnecting");
      const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (failures - 1), MAX_RECONNECT_DELAY_MS);
      clearTimer();
      reconnectTimer = setTimeout(connect, delay);
    });
  };

  return {
    transport: "sse",
    start: () => {
      stopped = false;
      connect();
    },
    stop: () => {
      stopped = true;
      clearTimer();
      source?.close();
      source = null;
      onStatusChange("disconnected");
    },
  };
}
