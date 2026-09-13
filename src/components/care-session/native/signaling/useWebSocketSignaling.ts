"use client";
// WebSocket channel — OPTIONAL transport for self-hosted/Node deployments.
// Requires the dedicated signaling server (scripts/signaling-server.ts) since
// serverless Next.js route handlers cannot reliably hold a WS upgrade.
// Enabled with NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket +
// NEXT_PUBLIC_SIGNALING_WS_URL. Falls back to SSE on failure.
//
// Unlike SSE/polling, WebSocket is bidirectional: it can also SEND signals.

import {
  parseCareSessionSignal,
  supportsWebSocket,
  type CareSessionParticipantRole,
  type OutgoingSignal,
  type SignalingChannel,
  type SignalingChannelCallbacks,
} from "./types";

const MAX_RECONNECT_DELAY_MS = 15_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
const CLIENT_PING_INTERVAL_MS = 20_000;

export type WebSocketSignalingChannel = SignalingChannel & {
  /** Sends a signal over the socket. Returns false when the socket is not open. */
  send: (signal: OutgoingSignal) => boolean;
};

export type CreateWebSocketChannelInput = SignalingChannelCallbacks & {
  sessionId: string;
  role: CareSessionParticipantRole;
  wsUrl: string;
  /** Patient join-link token — the WS server validates it against the DB hash. */
  patientJoinToken?: string | null;
  onFatalError?: () => void;
  maxConsecutiveFailures?: number;
};

/**
 * Fetches a short-lived signaling ticket via a same-origin POST (cookies
 * work fine here) so the WebSocket handshake can authenticate on ANY host —
 * cookies alone don't reach a WS server on a different domain. See
 * src/lib/care-session/signaling-ticket.ts for the full rationale.
 */
async function fetchSignalingTicket(sessionId: string, patientJoinToken?: string | null): Promise<string | null> {
  try {
    const res = await fetch(`/api/care-session/${sessionId}/signal/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ patientJoinToken: patientJoinToken ?? undefined }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ticket?: string };
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

export function createWebSocketSignalingChannel({
  sessionId,
  role,
  wsUrl,
  patientJoinToken,
  onSignal,
  onStatusChange,
  onFatalError,
  maxConsecutiveFailures = 3,
}: CreateWebSocketChannelInput): WebSocketSignalingChannel {
  let socket: WebSocket | null = null;
  let stopped = false;
  let failures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let connecting = false;

  const clearTimers = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  };

  const connect = async () => {
    if (stopped || connecting) return;
    if (!supportsWebSocket() || !wsUrl) {
      onStatusChange("error");
      onFatalError?.();
      return;
    }

    connecting = true;
    onStatusChange(failures === 0 ? "connecting" : "reconnecting");

    // A fresh ticket is minted for every (re)connection attempt — it expires
    // in 60s, so a stale one from a previous attempt would be rejected.
    const ticket = await fetchSignalingTicket(sessionId, patientJoinToken);
    connecting = false;
    if (stopped) return;

    try {
      const base = wsUrl.replace(/\/+$/, "");
      const params = new URLSearchParams({ role });
      if (ticket) params.set("ticket", ticket);
      if (patientJoinToken) params.set("token", patientJoinToken);
      socket = new WebSocket(`${base}/care-session/${sessionId}?${params.toString()}`);
    } catch {
      onStatusChange("error");
      onFatalError?.();
      return;
    }

    socket.onopen = () => {
      failures = 0;
      onStatusChange("connected");
      clearTimers();
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, CLIENT_PING_INTERVAL_MS);
    };

    socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(String(event.data));
        if (raw?.type === "pong" || raw?.type === "ping") return;
        const signal = parseCareSessionSignal(raw);
        if (signal) onSignal(signal);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      clearTimers();
      socket = null;
      if (stopped) return;
      failures += 1;
      if (failures >= maxConsecutiveFailures) {
        onStatusChange("error");
        onFatalError?.();
        return;
      }
      onStatusChange("reconnecting");
      const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (failures - 1), MAX_RECONNECT_DELAY_MS);
      reconnectTimer = setTimeout(() => void connect(), delay);
    };

    socket.onerror = () => {
      // onclose fires right after — reconnection is handled there.
    };
  };

  return {
    transport: "websocket",
    start: () => {
      stopped = false;
      void connect();
    },
    stop: () => {
      stopped = true;
      clearTimers();
      socket?.close();
      socket = null;
      onStatusChange("disconnected");
    },
    send: (signal) => {
      if (socket?.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ ...signal, sessionId }));
      return true;
    },
  };
}
