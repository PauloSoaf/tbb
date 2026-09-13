/* eslint-disable no-console */
// End-to-end smoke test for the WebSocket signaling server.
// Run with the server already up (in another terminal):
//   npm run signaling
//   npx tsx scripts/smoke-signaling-server.ts [ws://localhost:3001]
//
// It picks a real care session from the DB, signs real JWTs/tickets (same
// secret the app uses), connects one client per role and asserts:
//   1. an unauthenticated client is rejected;
//   2. a frame sent by the nutritionist reaches the patient (via cookie auth);
//   3. senderRole is stamped by the SERVER (impersonation attempt is ignored);
//   4. TICKET auth works — this is the path production actually uses when
//      this server runs on a different host than the Next.js app (cookies
//      are host-only and never reach a cross-domain WS server).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

function loadDotEnv(file = ".env") {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* rely on real env */ }
}
loadDotEnv();

const WS_URL = process.argv[2] ?? process.env.NEXT_PUBLIC_SIGNALING_WS_URL ?? "ws://localhost:3001";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const cs = await prisma.careSession.findFirst({
    select: { id: true, nutritionistId: true, patientId: true },
    orderBy: { createdAt: "desc" },
  });
  await prisma.$disconnect();
  if (!cs) fail("no care session in DB — create one in the app first");

  const nutriJwt = await new SignJWT({ userId: "smoke", nutritionistId: cs.nutritionistId, nutritionistSlug: "smoke", role: "OWNER" })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setIssuer("nutriopus").setAudience("nutriopus-app").setExpirationTime("5m").sign(SECRET);
  const patientJwt = await new SignJWT({ patientAccountId: "smoke", patientId: cs.patientId, nutritionistId: cs.nutritionistId, nutritionistSlug: "smoke" })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setIssuer("nutriopus-patient").setAudience("nutriopus-patient-portal").setExpirationTime("5m").sign(SECRET);

  const roomUrl = `${WS_URL.replace(/\/+$/, "")}/care-session/${cs.id}`;

  // 1. Unauthenticated connection must be rejected.
  await new Promise<void>((resolveTest) => {
    const bad = new WebSocket(roomUrl);
    const timer = setTimeout(() => fail("unauthenticated client was NOT rejected in 5s"), 5000);
    bad.on("open", () => fail("unauthenticated client connected — auth is broken!"));
    bad.on("error", () => { clearTimeout(timer); console.log("✓ unauthenticated client rejected"); resolveTest(); });
  });

  // 2 + 3. Authenticated relay with server-stamped senderRole.
  const nutri = new WebSocket(roomUrl, { headers: { cookie: `nutriopus-session=${nutriJwt}`, origin: "http://localhost:3000" } });
  const patient = new WebSocket(roomUrl, { headers: { cookie: `nutriopus-patient-session=${patientJwt}`, origin: "http://localhost:3000" } });

  await Promise.all([
    new Promise<void>((r, j) => { nutri.on("open", () => r()); nutri.on("error", (e) => j(new Error(`nutri connect failed: ${e.message}`))); }),
    new Promise<void>((r, j) => { patient.on("open", () => r()); patient.on("error", (e) => j(new Error(`patient connect failed: ${e.message}`))); }),
  ]).catch((e) => fail(e.message));
  console.log("✓ both roles authenticated and joined the room");

  const received = new Promise<Record<string, unknown>>((r) => {
    patient.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "offer") r(msg);
    });
  });

  // Impersonation attempt: client claims senderRole PATIENT — server must stamp NUTRITIONIST.
  nutri.send(JSON.stringify({ type: "offer", senderRole: "PATIENT", payload: { sdp: "smoke-test", epoch: 1 } }));

  const msg = await Promise.race([
    received,
    new Promise<never>((_, j) => setTimeout(() => j(new Error("relay timeout: patient never received the offer")), 5000)),
  ]).catch((e) => fail((e as Error).message));

  if (msg.senderRole !== "NUTRITIONIST") fail(`senderRole not enforced by server (got ${String(msg.senderRole)})`);
  console.log("✓ offer relayed nutritionist → patient with server-stamped senderRole");

  nutri.close();
  patient.close();

  // 4. Ticket auth — no cookies at all, only `?ticket=` in the URL. This is
  // what production uses (WS server on a different host than the app).
  const ticket = await new SignJWT({
    sessionId: cs.id,
    role: "NUTRITIONIST",
    nutritionistId: cs.nutritionistId,
    patientId: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("nutriopus-signaling")
    .setAudience("nutriopus-ws")
    .setExpirationTime("60s")
    .sign(SECRET);

  await new Promise<void>((r, j) => {
    const ws = new WebSocket(`${roomUrl}?ticket=${ticket}`, { headers: { origin: "http://localhost:3000" } });
    const timer = setTimeout(() => j(new Error("ticket-authenticated client did not connect in 5s")), 5000);
    ws.on("open", () => { clearTimeout(timer); ws.close(); r(); });
    ws.on("error", (e) => { clearTimeout(timer); j(new Error(`ticket auth failed: ${e.message}`)); });
  }).catch((e) => fail((e as Error).message));
  console.log("✓ ticket-only auth works (no cookies) — the production cross-domain path");

  console.log("\nSMOKE TEST PASSED — signaling server is working.");
  process.exit(0);
}

void main();
