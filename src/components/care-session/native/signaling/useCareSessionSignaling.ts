"use client";
// Transport-agnostic signaling client for the native care-session call.
//
// Receive path:  SSE (default) → WebSocket (optional) → polling (fallback).
// Send path:     always POST /api/care-session/[sessionId]/signal
//                (WebSocket also sends over the socket when open).
//
// useNativeWebRTC depends on THIS hook only — never on a concrete transport.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveSignalingTransport,
  type CareSessionParticipantRole,
  type CareSessionSignal,
  type OutgoingSignal,
  type SignalingChannel,
  type SignalingStatus,
  type SignalingTransport,
} from "./types";
import { createSseSignalingChannel } from "./useSseSignaling";
import { createPollingSignalingChannel } from "./usePollingSignaling";
import {
  createWebSocketSignalingChannel,
  type WebSocketSignalingChannel,
} from "./useWebSocketSignaling";

export type UseCareSessionSignalingInput = {
  sessionId: string;
  role: CareSessionParticipantRole;
  patientJoinToken?: string | null;
  /** Explicit transport override; defaults to NEXT_PUBLIC_SIGNALING_TRANSPORT or "sse". */
  transport?: SignalingTransport;
  /** When false the channel stays closed (e.g. before the user starts the call). */
  enabled?: boolean;
  onSignal: (signal: CareSessionSignal) => void;
  onStatusChange?: (status: SignalingStatus) => void;
};

export type CareSessionSignalingClient = {
  status: SignalingStatus;
  /** Transport currently in use (may differ from requested after fallback). */
  activeTransport: SignalingTransport | null;
  sendSignal: (signal: OutgoingSignal) => Promise<void>;
  reconnect: () => void;
  close: () => void;
};

export function useCareSessionSignaling({
  sessionId,
  role,
  patientJoinToken,
  transport,
  enabled = true,
  onSignal,
  onStatusChange,
}: UseCareSessionSignalingInput): CareSessionSignalingClient {
  const [status, setStatus] = useState<SignalingStatus>("idle");
  const [activeTransport, setActiveTransport] = useState<SignalingTransport | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const channelRef = useRef<SignalingChannel | null>(null);
  const wsChannelRef = useRef<WebSocketSignalingChannel | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Keep latest callbacks in refs so channels never hold stale closures.
  const onSignalRef = useRef(onSignal);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onSignalRef.current = onSignal; }, [onSignal]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const emitStatus = useCallback((next: SignalingStatus) => {
    setStatus(next);
    onStatusChangeRef.current?.(next);
  }, []);

  const handleSignal = useCallback((signal: CareSessionSignal) => {
    // Dedup across transports/reconnects: a signal id is processed once.
    if (seenIdsRef.current.has(signal.id)) return;
    seenIdsRef.current.add(signal.id);
    if (seenIdsRef.current.size > 2000) {
      // Cheap trim so a long call doesn't grow unbounded.
      seenIdsRef.current = new Set(Array.from(seenIdsRef.current).slice(-1000));
    }
    onSignalRef.current(signal);
  }, []);

  // Channel lifecycle lives in ONE effect. All state updates triggered by the
  // channel happen asynchronously (events/timeouts), never during the effect
  // body itself.
  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let channel: SignalingChannel | null = null;

    const start = (wanted: SignalingTransport) => {
      if (disposed) return;
      channel?.stop();
      wsChannelRef.current = null;
      setActiveTransport(wanted);

      if (wanted === "websocket") {
        const wsChannel = createWebSocketSignalingChannel({
          sessionId,
          role,
          wsUrl: process.env.NEXT_PUBLIC_SIGNALING_WS_URL ?? "",
          patientJoinToken,
          onSignal: handleSignal,
          onStatusChange: emitStatus,
          // WebSocket unavailable → degrade STRAIGHT to polling. (SSE is
          // skipped on purpose: under `next dev` an SSE stream can "connect"
          // and then silently never deliver — polling always answers.)
          onFatalError: () => start("polling"),
        });
        channel = wsChannel;
        wsChannelRef.current = wsChannel;
      } else if (wanted === "sse") {
        channel = createSseSignalingChannel({
          sessionId,
          role,
          patientJoinToken,
          onSignal: handleSignal,
          onStatusChange: emitStatus,
          // SSE unavailable → last resort: polling.
          onFatalError: () => start("polling"),
        });
      } else {
        channel = createPollingSignalingChannel({
          sessionId,
          role,
          patientJoinToken,
          onSignal: handleSignal,
          onStatusChange: emitStatus,
        });
      }

      channelRef.current = channel;
      channel.start();
    };

    // Defer the initial connection one tick so channel status callbacks never
    // set state synchronously inside this effect.
    const kickoff = setTimeout(() => start(resolveSignalingTransport(transport)), 0);

    return () => {
      disposed = true;
      clearTimeout(kickoff);
      channel?.stop();
      channelRef.current = null;
      wsChannelRef.current = null;
    };
  }, [enabled, transport, sessionId, role, patientJoinToken, reconnectNonce, handleSignal, emitStatus]);

  const sendSignal = useCallback(async (signal: OutgoingSignal) => {
    // WebSocket transport sends over the socket when open…
    if (wsChannelRef.current?.send(signal)) return;

    // …otherwise (SSE/polling/WS-closed) send via POST. Signaling is live
    // state: it must NEVER touch any cache layer.
    const res = await fetch(`/api/care-session/${sessionId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ ...signal, authToken: patientJoinToken ?? undefined }),
    });
    if (!res.ok) {
      throw new Error(`signaling_send_failed_${res.status}`);
    }
  }, [sessionId, patientJoinToken]);

  const reconnect = useCallback(() => {
    // Bump the nonce → the lifecycle effect tears down and reconnects.
    setReconnectNonce((n) => n + 1);
  }, []);

  const close = useCallback(() => {
    channelRef.current?.stop();
    channelRef.current = null;
    wsChannelRef.current = null;
    emitStatus("disconnected");
  }, [emitStatus]);

  return { status, activeTransport, sendSignal, reconnect, close };
}
