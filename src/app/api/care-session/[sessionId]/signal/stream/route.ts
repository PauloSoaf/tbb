import type { NextRequest } from "next/server";
import {
  fetchSignalsForCaller,
  resolveCallerWithSession,
  serializeSignal,
} from "@/lib/care-session/signaling-server";

// SSE stream: the client keeps ONE EventSource open and receives `signal`
// events in real time — no client-side polling. The server checks for new
// signals in a controlled internal loop (beta strategy; for multi-instance
// production use Redis Pub/Sub or the dedicated WebSocket server — see
// docs/CARE_SESSION_SIGNALING_SSE.md).
//
// LIVE state: absolutely no caching.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVER_CHECK_INTERVAL_MS = 750;
const HEARTBEAT_INTERVAL_MS = 15_000;

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const patientJoinToken = req.nextUrl.searchParams.get("token");
  const caller = await resolveCallerWithSession(sessionId, patientJoinToken);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // Cursor: resume after a specific signal (reconnection) or start with a
  // small lookback window. The lookback closes the race where the caller's
  // offer lands milliseconds BEFORE this stream opens; stale signals are
  // harmless (client dedups by id and ignores old negotiation epochs).
  const REPLAY_LOOKBACK_MS = 120_000;
  const after = req.nextUrl.searchParams.get("after");
  const afterId = req.nextUrl.searchParams.get("afterId") ?? "";
  let cursor = {
    createdAt: after && !Number.isNaN(new Date(after).getTime())
      ? after
      : new Date(Date.now() - REPLAY_LOOKBACK_MS).toISOString(),
    id: afterId,
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let checkTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let checking = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (checkTimer) clearInterval(checkTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        checkTimer = null;
        heartbeatTimer = null;
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };

      const safeEnqueue = (chunk: Uint8Array): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      // Close correctly when the request is aborted (tab closed, reconnect…).
      req.signal.addEventListener("abort", cleanup);
      if (req.signal.aborted) {
        cleanup();
        return;
      }

      const check = async () => {
        if (closed || checking) return;
        checking = true;
        try {
          const signals = await fetchSignalsForCaller(
            sessionId,
            caller,
            cursor.createdAt,
            cursor.id
          );
          for (const s of signals) {
            cursor = { createdAt: s.createdAt.toISOString(), id: s.id };
            if (!safeEnqueue(sseEvent("signal", serializeSignal(s)))) return;
          }
        } catch {
          // transient DB error — keep the stream alive and retry next tick
        } finally {
          checking = false;
        }
      };

      // Initial hello so EventSource fires `open` immediately.
      safeEnqueue(sseEvent("heartbeat", { ts: new Date().toISOString() }));
      void check();

      checkTimer = setInterval(() => void check(), SERVER_CHECK_INTERVAL_MS);
      heartbeatTimer = setInterval(() => {
        safeEnqueue(sseEvent("heartbeat", { ts: new Date().toISOString() }));
      }, HEARTBEAT_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
