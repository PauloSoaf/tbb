/* eslint-disable no-console */
// Dedicated WebSocket signaling server for the native care-session call.
//
// WHY a separate process: live signaling (offer/answer/ICE/presence) must not
// depend on Next.js route handlers (serverless can't hold a WS upgrade, and
// the dev server buffers/holds streamed responses) nor on the database on the
// hot path (SSE loops polling Prisma can exhaust the connection pool). This
// server keeps rooms IN MEMORY and only touches the DB once per connection,
// to authorize the join.
//
// Run:
//   npm run signaling            (port 3001 by default)
// Client env:
//   NEXT_PUBLIC_SIGNALING_TRANSPORT=websocket
//   NEXT_PUBLIC_SIGNALING_WS_URL=ws://localhost:3001
//
// Path: /care-session/:sessionId[?ticket=<signalingTicket>]
// Auth (server-side, never trusted from the client), checked in order:
//   1. `?ticket=` — short-lived JWT minted by POST /api/care-session/[id]/
//      signal/ticket (same-origin, cookies work there). THIS IS THE PATH
//      PRODUCTION USES: when this server runs on a different host than the
//      Next.js app (Railway/Render/Fly/subdomain), session cookies are
//      host-only and never reach it — the ticket is what travels instead.
//   2. `?token=` patient join token → sha256 compared with the DB hash
//      (works from any host — it's not a cookie).
//   3. `nutriopus-session` / `nutriopus-patient-session` cookies — ONLY
//      works when this server shares the exact host with the Next.js app
//      (typically local dev on localhost).
// The participant ROLE is derived from whichever credential authenticated —
// never trusted from the client.
//
// Docs: docs/CARE_SESSION_SIGNALING_WEBSOCKET.md

import { createServer, type IncomingMessage } from "node:http";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";

// ── env (.env is not auto-loaded outside Next) ──────────────────────────────

function loadDotEnv(file = ".env") {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue; // real env wins
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env — rely on real environment variables
  }
}
loadDotEnv();

// Most PaaS hosts (Railway/Render/Fly) inject $PORT and require binding to it.
const PORT = Number(process.env.PORT ?? process.env.SIGNALING_SERVER_PORT ?? 3001);
const PING_INTERVAL_MS = 20_000;
const MAX_PAYLOAD_BYTES = 256 * 1024; // SDP offers are ~10-50KB; 256KB is generous

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
const TICKET_ISSUER = "nutriopus-signaling";
const TICKET_AUDIENCE = "nutriopus-ws";

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    // Comma-separated extra origins, e.g. "https://nutriopus.com,https://www.nutriopus.com"
    // — apex and www are different origins and both may hit this server.
    ...(process.env.SIGNALING_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean) as string[]
);

const ALLOWED_SIGNAL_TYPES = new Set([
  "presence", "offer", "answer", "ice-candidate", "media-state",
  "screen-share-started", "screen-share-stopped", "hangup", "heartbeat",
]);

const prisma = new PrismaClient();

// ── auth ─────────────────────────────────────────────────────────────────────

type Role = "NUTRITIONIST" | "PATIENT";

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

async function verifyJwt(token: string, issuer: string, audience: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer, audience });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Authorizes the connection and derives the role server-side. */
async function authorize(req: IncomingMessage, sessionId: string): Promise<Role | null> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const cookies = parseCookies(req.headers.cookie);

  // 1. Signaling ticket — THE production path. Minted by the Next.js app via
  // a same-origin POST (see src/lib/care-session/signaling-ticket.ts), so it
  // works regardless of which host this server runs on.
  const ticket = url.searchParams.get("ticket");
  if (ticket) {
    const payload = await verifyJwt(ticket, TICKET_ISSUER, TICKET_AUDIENCE);
    if (
      payload &&
      payload.sessionId === sessionId &&
      (payload.role === "NUTRITIONIST" || payload.role === "PATIENT")
    ) {
      return payload.role;
    }
  }

  // 2. Patient join token (link do paciente) — also host-independent.
  const joinToken = url.searchParams.get("token");
  if (joinToken) {
    const tokenHash = createHash("sha256").update(joinToken).digest("hex");
    const cs = await prisma.careSession.findUnique({ where: { id: sessionId } });
    if (
      cs?.patientJoinTokenHash === tokenHash &&
      cs.patientJoinTokenExpiresAt &&
      new Date() <= cs.patientJoinTokenExpiresAt
    ) {
      return "PATIENT";
    }
  }

  // 3. Nutritionist session cookie — only reaches this server when it shares
  // the exact host as the Next.js app (local dev).
  const nutriToken = cookies["nutriopus-session"];
  if (nutriToken) {
    const payload = await verifyJwt(nutriToken, "nutriopus", "nutriopus-app");
    const nutritionistId = payload?.nutritionistId;
    if (typeof nutritionistId === "string") {
      const cs = await prisma.careSession.findFirst({
        where: { id: sessionId, nutritionistId },
        select: { id: true },
      });
      if (cs) return "NUTRITIONIST";
    }
  }

  // 4. Patient session cookie — same host-sharing caveat as above.
  const patientToken = cookies["nutriopus-patient-session"];
  if (patientToken) {
    const payload = await verifyJwt(patientToken, "nutriopus-patient", "nutriopus-patient-portal");
    const patientId = payload?.patientId;
    const nutritionistId = payload?.nutritionistId;
    if (typeof patientId === "string" && typeof nutritionistId === "string") {
      const cs = await prisma.careSession.findFirst({
        where: { id: sessionId, patientId, nutritionistId },
        select: { id: true },
      });
      if (cs) return "PATIENT";
    }
  }

  return null;
}

// ── rooms ────────────────────────────────────────────────────────────────────

type Client = {
  socket: WebSocket;
  sessionId: string;
  role: Role;
  isAlive: boolean;
};

const rooms = new Map<string, Set<Client>>();

function joinRoom(client: Client) {
  let room = rooms.get(client.sessionId);
  if (!room) {
    room = new Set();
    rooms.set(client.sessionId, room);
  }
  room.add(client);
}

function leaveRoom(client: Client) {
  const room = rooms.get(client.sessionId);
  if (!room) return;
  room.delete(client);
  if (room.size === 0) rooms.delete(client.sessionId);
}

function broadcastToOthers(client: Client, data: string) {
  const room = rooms.get(client.sessionId);
  if (!room) return;
  for (const other of room) {
    if (other !== client && other.socket.readyState === WebSocket.OPEN) {
      other.socket.send(data);
    }
  }
}

// ── server (manual upgrade so auth can be async) ────────────────────────────

const httpServer = createServer((req, res) => {
  // Simple health endpoint for monitoring / smoke tests.
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

httpServer.on("upgrade", (req, socket, head) => {
  void (async () => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const match = url.pathname.match(/^\/care-session\/([\w-]+)$/);
      if (!match) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      // Origin allow-list (browsers always send Origin on WS handshakes).
      const origin = req.headers.origin;
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      const sessionId = match[1];
      const role = await authorize(req, sessionId);
      if (!role) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, { sessionId, role });
      });
    } catch (err) {
      console.error("[signaling] upgrade error:", err);
      socket.destroy();
    }
  })();
});

wss.on("connection", (socket: WebSocket, _req: IncomingMessage, ctx: { sessionId: string; role: Role }) => {
  const client: Client = { socket, sessionId: ctx.sessionId, role: ctx.role, isAlive: true };
  joinRoom(client);
  console.log(`[signaling] ${client.role} joined room ${client.sessionId} (${rooms.get(client.sessionId)?.size} in room)`);

  socket.on("pong", () => {
    client.isAlive = true;
  });

  socket.on("message", (raw) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
      return;
    }
    if (parsed.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
      return;
    }
    if (!ALLOWED_SIGNAL_TYPES.has(String(parsed.type))) return;

    // Stamp server-side id/createdAt and ENFORCE the authenticated role —
    // a client can never impersonate the other side.
    const signal = {
      type: parsed.type,
      targetRole: parsed.targetRole,
      payload: parsed.payload ?? {},
      id: randomUUID(),
      sessionId: client.sessionId,
      senderRole: client.role,
      createdAt: new Date().toISOString(),
    };
    broadcastToOthers(client, JSON.stringify(signal));
  });

  socket.on("close", () => {
    leaveRoom(client);
    console.log(`[signaling] ${client.role} left room ${client.sessionId}`);
    // Presence courtesy: tell the room the participant dropped (covers tab
    // close / crash, where the client can't send its own "left").
    broadcastToOthers(client, JSON.stringify({
      type: "presence",
      payload: { status: "left" },
      id: randomUUID(),
      sessionId: client.sessionId,
      senderRole: client.role,
      createdAt: new Date().toISOString(),
    }));
  });
});

// Heartbeat: terminate dead connections.
const pingTimer = setInterval(() => {
  for (const room of rooms.values()) {
    for (const client of room) {
      if (!client.isAlive) {
        client.socket.terminate();
        continue;
      }
      client.isAlive = false;
      client.socket.ping();
    }
  }
}, PING_INTERVAL_MS);

wss.on("close", () => clearInterval(pingTimer));

process.on("SIGINT", () => {
  clearInterval(pingTimer);
  httpServer.close();
  void prisma.$disconnect().finally(() => process.exit(0));
});

httpServer.listen(PORT, () => {
  console.log(`[signaling] WebSocket signaling server listening on ws://localhost:${PORT}`);
  console.log(`[signaling] health check: http://localhost:${PORT}/health`);
});
