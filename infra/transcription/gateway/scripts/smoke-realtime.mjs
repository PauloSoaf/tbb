import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { mintEphemeralToken } from "../src/token.mjs";

const secret = process.env.TRANSCRIPTION_GATEWAY_HMAC_SECRET || "";
const origin = JSON.parse(
  process.env.GATEWAY_ALLOWED_ORIGINS || '["http://localhost:3000"]',
)[0];
const model =
  process.env.TRANSCRIPTION_DEFAULT_MODEL ||
  "deepdml/faster-whisper-large-v3-turbo-ct2";
const language = process.env.TRANSCRIPTION_LANGUAGE || "pt";
const now = Math.floor(Date.now() / 1000);
const token = mintEphemeralToken(
  {
    v: 1,
    iss: process.env.GATEWAY_TOKEN_ISSUER || "nutriopus",
    aud: process.env.GATEWAY_TOKEN_AUDIENCE || "transcription-gateway",
    sub: "smoke-user",
    tenantId: "smoke-tenant",
    appointmentId: "smoke-appointment",
    participantId: "smoke-participant",
    scope: ["transcription:stream"],
    model,
    language,
    origin,
    iat: now,
    nbf: now,
    exp: now + 60,
    jti: randomUUID(),
  },
  secret,
);

const socket = new WebSocket(
  "ws://127.0.0.1:8080/v1/realtime",
  ["nutriopus", `hmac.${token}`],
  { origin, handshakeTimeout: 20_000 },
);

const timeout = setTimeout(() => {
  socket.terminate();
  process.stderr.write("Timed out waiting for a Speaches realtime event\n");
  process.exitCode = 1;
}, 30_000);

socket.on("open", () => {
  socket.send(
    JSON.stringify({
      type: "session.update",
      session: {
        input_audio_transcription: { model, language },
      },
    }),
  );
});

socket.on("message", (data) => {
  let eventType = "unknown";
  try {
    eventType = JSON.parse(data.toString("utf8")).type || "unknown";
  } catch {
    // The smoke test reports only event type and never provider payload content.
  }
  clearTimeout(timeout);
  process.stdout.write(
    `${JSON.stringify({ websocket: "ok", firstEventType: eventType })}\n`,
  );
  socket.close(1000, "smoke test complete");
});

socket.on("unexpected-response", (_request, response) => {
  clearTimeout(timeout);
  process.stderr.write(`Gateway returned HTTP ${response.statusCode}\n`);
  process.exitCode = 1;
});

socket.on("error", (error) => {
  clearTimeout(timeout);
  process.stderr.write(`Realtime smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
