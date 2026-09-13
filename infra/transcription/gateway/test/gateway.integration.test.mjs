import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { WebSocket, WebSocketServer } from "ws";
import { mintEphemeralToken } from "../src/token.mjs";

const gatewayRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hmacSecret = "integration-hmac-secret-with-at-least-32-bytes";
const providerKey = "integration-provider-key-with-24-bytes";
const allowedOrigin = "http://localhost:3000";
const model = "default-model";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function reservePort() {
  const server = createServer();
  const port = await listen(server);
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function waitForReady(url, child, output) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Gateway exited early: ${output.join("")}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The child may still be binding its socket.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Gateway did not become ready: ${output.join("")}`);
}

test(
  "authenticates, sanitizes and relays a realtime session",
  { timeout: 15_000 },
  async (context) => {
    let upstreamAuthorization = "";
    let upstreamModel = "";
    let upstreamEvent;

    const providerHttp = createServer((request, response) => {
      if (request.url === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end('{"status":"ok"}');
        return;
      }
      response.writeHead(404);
      response.end();
    });
    const providerWs = new WebSocketServer({ noServer: true });
    providerHttp.on("upgrade", (request, socket, head) => {
      upstreamAuthorization = request.headers.authorization || "";
      upstreamModel = new URL(
        request.url,
        "http://provider.local",
      ).searchParams.get("model");
      providerWs.handleUpgrade(request, socket, head, (webSocket) => {
        providerWs.emit("connection", webSocket);
      });
    });
    providerWs.on("connection", (webSocket) => {
      webSocket.on("message", (data) => {
        upstreamEvent = JSON.parse(data.toString("utf8"));
        webSocket.send(JSON.stringify({ type: "session.updated" }));
      });
    });

    const providerPort = await listen(providerHttp);
    const gatewayPort = await reservePort();
    const childOutput = [];
    const child = spawn(process.execPath, ["src/server.mjs"], {
      cwd: gatewayRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        GATEWAY_HOST: "127.0.0.1",
        GATEWAY_PORT: String(gatewayPort),
        GATEWAY_LOG_LEVEL: "error",
        GATEWAY_ALLOWED_ORIGINS: JSON.stringify([allowedOrigin]),
        GATEWAY_TOKEN_MAX_TTL_SECONDS: "120",
        TRANSCRIPTION_GATEWAY_HMAC_SECRET: hmacSecret,
        TRANSCRIPTION_DEFAULT_MODEL: model,
        TRANSCRIPTION_FALLBACK_MODEL: "fallback-model",
        TRANSCRIPTION_ALLOWED_MODELS: JSON.stringify([model, "fallback-model"]),
        SPEACHES_API_KEY: providerKey,
        SPEACHES_HEALTH_URL: `http://127.0.0.1:${providerPort}/health`,
        SPEACHES_WS_URL: `ws://127.0.0.1:${providerPort}/v1/realtime`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => childOutput.push(chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => childOutput.push(chunk.toString("utf8")));

    context.after(async () => {
      child.kill("SIGTERM");
      if (child.exitCode === null) {
        await Promise.race([
          once(child, "exit"),
          new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
        ]);
      }
      providerWs.close();
      await new Promise((resolveClose) => providerHttp.close(resolveClose));
    });

    await waitForReady(
      `http://127.0.0.1:${gatewayPort}/health/ready`,
      child,
      childOutput,
    );

    const now = Math.floor(Date.now() / 1000);
    const token = mintEphemeralToken(
      {
        v: 1,
        iss: "nutriopus",
        aud: "transcription-gateway",
        sub: "user-1",
        tenantId: "tenant-1",
        appointmentId: "appointment-1",
        participantId: "participant-1",
        scope: ["transcription:stream"],
        model,
        language: "pt",
        origin: allowedOrigin,
        iat: now,
        nbf: now,
        exp: now + 60,
        jti: randomUUID(),
      },
      hmacSecret,
    );

    const client = new WebSocket(
      `ws://127.0.0.1:${gatewayPort}/v1/realtime`,
      ["nutriopus", `hmac.${token}`],
      { origin: allowedOrigin },
    );
    context.after(() => client.terminate());
    await once(client, "open");

    client.send(
      JSON.stringify({
        type: "session.update",
        session: {
          input_audio_format: "pcm16",
          input_audio_transcription: { model },
        },
      }),
    );

    const [providerReply] = await once(client, "message");
    assert.equal(JSON.parse(providerReply.toString("utf8")).type, "session.updated");
    assert.equal(upstreamAuthorization, `Bearer ${providerKey}`);
    assert.equal(upstreamModel, model);
    assert.equal(upstreamEvent.session.input_audio_transcription.model, model);
    assert.equal(upstreamEvent.session.input_audio_transcription.language, "pt");
  },
);
