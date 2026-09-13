"use client";
// HTTP polling receive channel — EMERGENCY FALLBACK ONLY.
// Used when SSE (and WebSocket, if enabled) are unavailable, e.g. very old
// browsers or proxies that kill event streams. Never the default transport.

import {
  compareSignals,
  parseCareSessionSignal,
  type CareSessionParticipantRole,
  type SignalingChannel,
  type SignalingChannelCallbacks,
} from "./types";

const POLL_INTERVAL_MS = 1_000;
// Small lookback so an offer that lands a moment before we start polling isn't
// missed, without replaying the whole session history (which would fire stale
// presence/offer signals). Fresh (re)negotiation is driven by `presence`.
const INITIAL_LOOKBACK_MS = 8_000;

export type CreatePollingChannelInput = SignalingChannelCallbacks & {
  sessionId: string;
  role: CareSessionParticipantRole;
  patientJoinToken?: string | null;
  intervalMs?: number;
};

export function createPollingSignalingChannel({
  sessionId,
  role,
  patientJoinToken,
  onSignal,
  onStatusChange,
  intervalMs = POLL_INTERVAL_MS,
}: CreatePollingChannelInput): SignalingChannel {
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  // Start "now minus a short lookback", NOT epoch 0 — otherwise every historical
  // signal for this session replays on join (stale toasts, stale offers).
  let cursor: { createdAt: string; id: string } = {
    createdAt: new Date(Date.now() - INITIAL_LOOKBACK_MS).toISOString(),
    id: "",
  };

  const poll = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const params = new URLSearchParams({
        role,
        since: cursor.createdAt,
        afterId: cursor.id,
      });
      if (patientJoinToken) params.set("token", patientJoinToken);
      const res = await fetch(`/api/care-session/${sessionId}/signal?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { signals?: unknown[] };
      const signals = (data.signals ?? [])
        .map(parseCareSessionSignal)
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort(compareSignals);
      for (const signal of signals) {
        cursor = { createdAt: signal.createdAt, id: signal.id };
        onSignal(signal);
      }
      onStatusChange("connected");
    } catch {
      onStatusChange("reconnecting");
    } finally {
      inFlight = false;
    }
  };

  return {
    transport: "polling",
    start: () => {
      if (timer) return;
      onStatusChange("connecting");
      void poll();
      timer = setInterval(() => void poll(), intervalMs);
    },
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      onStatusChange("disconnected");
    },
  };
}
