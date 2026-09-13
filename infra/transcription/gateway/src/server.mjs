import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { loadConfig } from "./config.mjs";
import { TokenError, verifyEphemeralToken } from "./token.mjs";

const config = loadConfig();
const logPriority = { debug: 10, info: 20, warn: 30, error: 40 };
const allowedClientEvents = new Set([
  "session.update",
  "input_audio_buffer.append",
  "input_audio_buffer.commit",
  "input_audio_buffer.clear",
]);

const metrics = {
  activeConnections: 0,
  connectionsTotal: 0,
  upstreamFailuresTotal: 0,
  clientMessagesTotal: 0,
  upstreamMessagesTotal: 0,
  clientBytesTotal: 0,
  upstreamBytesTotal: 0,
  rejected: new Map(),
};

const connections = new Set();
const connectionsByIp = new Map();
const usedTokenIds = new Map();
let readinessCache = { checkedAt: 0, healthy: false };
let shuttingDown = false;

function log(level, event, details = {}) {
  if (logPriority[level] < logPriority[config.logLevel]) return;
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...details,
    })}\n`,
  );
}

function recordRejection(reason) {
  metrics.rejected.set(reason, (metrics.rejected.get(reason) || 0) + 1);
}

function renderMetrics() {
  const lines = [
    "# HELP nutriopus_transcription_gateway_active_connections Current WebSocket connections.",
    "# TYPE nutriopus_transcription_gateway_active_connections gauge",
    `nutriopus_transcription_gateway_active_connections ${metrics.activeConnections}`,
    "# HELP nutriopus_transcription_gateway_connections_total Accepted WebSocket connections.",
    "# TYPE nutriopus_transcription_gateway_connections_total counter",
    `nutriopus_transcription_gateway_connections_total ${metrics.connectionsTotal}`,
    "# HELP nutriopus_transcription_gateway_upstream_failures_total Speaches connection failures.",
    "# TYPE nutriopus_transcription_gateway_upstream_failures_total counter",
    `nutriopus_transcription_gateway_upstream_failures_total ${metrics.upstreamFailuresTotal}`,
    "# HELP nutriopus_transcription_gateway_messages_total Relayed WebSocket messages.",
    "# TYPE nutriopus_transcription_gateway_messages_total counter",
    `nutriopus_transcription_gateway_messages_total{direction="client"} ${metrics.clientMessagesTotal}`,
    `nutriopus_transcription_gateway_messages_total{direction="upstream"} ${metrics.upstreamMessagesTotal}`,
    "# HELP nutriopus_transcription_gateway_bytes_total Relayed WebSocket bytes.",
    "# TYPE nutriopus_transcription_gateway_bytes_total counter",
    `nutriopus_transcription_gateway_bytes_total{direction="client"} ${metrics.clientBytesTotal}`,
    `nutriopus_transcription_gateway_bytes_total{direction="upstream"} ${metrics.upstreamBytesTotal}`,
    "# HELP nutriopus_transcription_gateway_rejections_total Rejected upgrades or frames.",
    "# TYPE nutriopus_transcription_gateway_rejections_total counter",
  ];

  for (const [reason, count] of [...metrics.rejected.entries()].sort()) {
    lines.push(
      `nutriopus_transcription_gateway_rejections_total{reason="${reason}"} ${count}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

async function checkProviderHealth() {
  const now = Date.now();
  if (now - readinessCache.checkedAt < 2_000) return readinessCache.healthy;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  timeout.unref();

  try {
    const response = await fetch(config.speachesHealthUrl, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    readinessCache = { checkedAt: now, healthy: response.ok };
  } catch {
    readinessCache = { checkedAt: now, healthy: false };
  } finally {
    clearTimeout(timeout);
  }

  return readinessCache.healthy;
}

function hasMetricsAccess(request) {
  if (!config.metricsBearerToken) return true;
  return (
    request.headers.authorization ===
    `Bearer ${config.metricsBearerToken}`
  );
}

const httpServer = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://gateway.local").pathname;

  if (request.method !== "GET") {
    sendJson(response, 405, { status: "method_not_allowed" });
    return;
  }

  if (pathname === "/health/live") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (pathname === "/health" || pathname === "/health/ready") {
    const providerHealthy = await checkProviderHealth();
    sendJson(response, providerHealthy ? 200 : 503, {
      status: providerHealthy ? "ready" : "not_ready",
      provider: providerHealthy ? "online" : "offline",
    });
    return;
  }

  if (pathname === "/metrics") {
    if (!hasMetricsAccess(request)) {
      sendJson(response, 401, { status: "unauthorized" });
      return;
    }

    const body = renderMetrics();
    response.writeHead(200, {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "content-length": Buffer.byteLength(body),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
    return;
  }

  sendJson(response, 404, { status: "not_found" });
});

httpServer.requestTimeout = 10_000;
httpServer.headersTimeout = 10_000;

const webSocketServer = new WebSocketServer({
  noServer: true,
  clientTracking: false,
  maxPayload: config.maxMessageBytes,
  perMessageDeflate: false,
  handleProtocols(protocols) {
    return protocols.has("nutriopus") ? "nutriopus" : false;
  },
});

function rejectUpgrade(socket, status, reason) {
  recordRejection(reason);
  const statusText = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Too Many Requests",
    503: "Service Unavailable",
  }[status] || "Bad Request";

  socket.end(
    `HTTP/1.1 ${status} ${statusText}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
}

function parseProtocols(header) {
  if (typeof header !== "string" || header.length > 8192) return [];
  return header
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractToken(request, requestUrl) {
  const protocols = parseProtocols(request.headers["sec-websocket-protocol"]);
  const tokenProtocol = protocols.find((protocol) => protocol.startsWith("hmac."));

  if (tokenProtocol) {
    if (!protocols.includes("nutriopus")) return null;
    return tokenProtocol.slice("hmac.".length);
  }

  return config.allowQueryToken ? requestUrl.searchParams.get("token") : null;
}

function getClientIp(request) {
  if (config.trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return request.socket.remoteAddress || "unknown";
}

function originIsAllowed(origin) {
  if (!origin) return !config.requireOrigin;
  return (
    config.allowedOrigins.includes("*") || config.allowedOrigins.includes(origin)
  );
}

function pruneUsedTokens() {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, expiresAt] of usedTokenIds) {
    if (expiresAt < now) usedTokenIds.delete(jti);
  }
}

function decodedBase64Size(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  ) {
    return -1;
  }

  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function validateClientEvent(data, isBinary, authorizedModel, language) {
  if (isBinary) {
    return { ok: false, reason: "binary_frame_not_allowed", closeCode: 1003 };
  }

  let event;
  try {
    event = JSON.parse(data.toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid_json", closeCode: 1007 };
  }

  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    !allowedClientEvents.has(event.type)
  ) {
    return { ok: false, reason: "event_not_allowed", closeCode: 1008 };
  }

  if (event.type === "input_audio_buffer.append") {
    const audioBytes = decodedBase64Size(event.audio);
    if (audioBytes < 0) {
      return { ok: false, reason: "invalid_audio", closeCode: 1007 };
    }
    if (audioBytes > config.maxAudioChunkBytes) {
      return { ok: false, reason: "audio_chunk_too_large", closeCode: 1009 };
    }
  }

  if (event.type === "session.update") {
    if (!event.session || typeof event.session !== "object") {
      return { ok: false, reason: "invalid_session", closeCode: 1007 };
    }

    const requestedModel = event.session.input_audio_transcription?.model;
    if (requestedModel && requestedModel !== authorizedModel) {
      return { ok: false, reason: "model_override_denied", closeCode: 1008 };
    }

    event.session.input_audio_transcription = {
      ...(event.session.input_audio_transcription || {}),
      model: authorizedModel,
      language,
    };
  }

  return { ok: true, data: JSON.stringify(event) };
}

function createRateWindow() {
  return { startedAt: Date.now(), messages: 0, bytes: 0 };
}

function consumeRate(window, bytes) {
  const now = Date.now();
  if (now - window.startedAt >= 1_000) {
    window.startedAt = now;
    window.messages = 0;
    window.bytes = 0;
  }

  window.messages += 1;
  window.bytes += bytes;
  return (
    window.messages <= config.maxMessagesPerSecond &&
    window.bytes <= config.maxBytesPerSecond
  );
}

function closeSocket(socket, code, reason) {
  if (
    socket.readyState === WebSocket.OPEN ||
    socket.readyState === WebSocket.CONNECTING
  ) {
    socket.close(code, reason.slice(0, 100));
  }
}

function canForwardCloseCode(code) {
  return (
    code === 1000 ||
    code === 1001 ||
    code === 1002 ||
    code === 1003 ||
    (code >= 1007 && code <= 1014) ||
    (code >= 3000 && code <= 4999)
  );
}

function relayConnection(client, request, context) {
  const connectionId = randomUUID();
  const authorizedModel = context.claims.model || config.defaultModel;
  const language = context.claims.language || config.defaultLanguage;
  const upstreamUrl = new URL(config.speachesWsUrl);
  upstreamUrl.searchParams.set("intent", "transcription");
  upstreamUrl.searchParams.set("model", authorizedModel);
  upstreamUrl.searchParams.set("language", language);

  const pending = [];
  let pendingBytes = 0;
  let closed = false;
  let lastActivityAt = Date.now();
  let clientAlive = true;
  const rateWindow = createRateWindow();

  const upstream = new WebSocket(upstreamUrl, {
    headers: {
      authorization: `Bearer ${config.speachesApiKey}`,
    },
    handshakeTimeout: config.upstreamConnectTimeoutMs,
    maxPayload: config.maxMessageBytes,
    perMessageDeflate: false,
  });

  metrics.activeConnections += 1;
  metrics.connectionsTotal += 1;
  connections.add(client);
  connectionsByIp.set(
    context.ip,
    (connectionsByIp.get(context.ip) || 0) + 1,
  );

  log("info", "connection.accepted", { connectionId });

  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(sessionTimeout);
    metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
    connections.delete(client);
    const ipConnections = (connectionsByIp.get(context.ip) || 1) - 1;
    if (ipConnections <= 0) connectionsByIp.delete(context.ip);
    else connectionsByIp.set(context.ip, ipConnections);
    log("info", "connection.closed", { connectionId });
  }

  client.on("pong", () => {
    clientAlive = true;
    lastActivityAt = Date.now();
  });

  client.on("message", (data, isBinary) => {
    lastActivityAt = Date.now();
    const inputBytes = Buffer.byteLength(data);

    if (!consumeRate(rateWindow, inputBytes)) {
      recordRejection("rate_limited");
      closeSocket(client, 1008, "rate limit exceeded");
      return;
    }

    const validated = validateClientEvent(
      data,
      isBinary,
      authorizedModel,
      language,
    );
    if (!validated.ok) {
      recordRejection(validated.reason);
      closeSocket(client, validated.closeCode, validated.reason);
      return;
    }

    const outputBytes = Buffer.byteLength(validated.data);
    metrics.clientMessagesTotal += 1;
    metrics.clientBytesTotal += outputBytes;

    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(validated.data);
      return;
    }

    if (upstream.readyState !== WebSocket.CONNECTING) {
      closeSocket(client, 1013, "provider unavailable");
      return;
    }

    if (pendingBytes + outputBytes > config.maxPendingBytes) {
      recordRejection("pending_buffer_full");
      closeSocket(client, 1013, "provider not ready");
      return;
    }

    pending.push(validated.data);
    pendingBytes += outputBytes;
  });

  client.on("close", () => {
    closeSocket(upstream, 1000, "client disconnected");
    cleanup();
  });

  client.on("error", () => {
    closeSocket(upstream, 1011, "client transport error");
    cleanup();
  });

  upstream.on("open", () => {
    readinessCache = { checkedAt: Date.now(), healthy: true };
    for (const message of pending) upstream.send(message);
    pending.length = 0;
    pendingBytes = 0;
  });

  upstream.on("message", (data, isBinary) => {
    lastActivityAt = Date.now();
    const bytes = Buffer.byteLength(data);
    metrics.upstreamMessagesTotal += 1;
    metrics.upstreamBytesTotal += bytes;
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
  });

  upstream.on("unexpected-response", (_request, response) => {
    metrics.upstreamFailuresTotal += 1;
    readinessCache = { checkedAt: Date.now(), healthy: false };
    log("warn", "upstream.rejected", {
      connectionId,
      statusCode: response.statusCode,
    });
    closeSocket(client, 1013, "provider unavailable");
  });

  upstream.on("error", () => {
    metrics.upstreamFailuresTotal += 1;
    readinessCache = { checkedAt: Date.now(), healthy: false };
    log("warn", "upstream.error", { connectionId });
    closeSocket(client, 1013, "provider unavailable");
  });

  upstream.on("close", (code) => {
    if (client.readyState === WebSocket.OPEN) {
      const safeCode = canForwardCloseCode(code) ? code : 1011;
      closeSocket(client, safeCode, "provider disconnected");
    }
    cleanup();
  });

  const heartbeat = setInterval(() => {
    const idleFor = Date.now() - lastActivityAt;
    if (
      !clientAlive ||
      idleFor > config.idleTimeoutSeconds * 1_000
    ) {
      closeSocket(client, 1001, "idle timeout");
      return;
    }

    clientAlive = false;
    if (client.readyState === WebSocket.OPEN) client.ping();
  }, config.heartbeatIntervalSeconds * 1_000);
  heartbeat.unref();

  const sessionTimeout = setTimeout(() => {
    closeSocket(client, 1000, "session limit reached");
  }, config.maxSessionSeconds * 1_000);
  sessionTimeout.unref();
}

webSocketServer.on("connection", relayConnection);

httpServer.on("upgrade", (request, socket, head) => {
  if (shuttingDown) {
    rejectUpgrade(socket, 503, "shutting_down");
    return;
  }

  const requestUrl = new URL(request.url || "/", "http://gateway.local");
  if (requestUrl.pathname !== "/v1/realtime") {
    rejectUpgrade(socket, 404, "path_not_found");
    return;
  }

  const origin =
    typeof request.headers.origin === "string" ? request.headers.origin : "";
  if (!originIsAllowed(origin)) {
    rejectUpgrade(socket, 403, "origin_denied");
    return;
  }

  const token = extractToken(request, requestUrl);
  if (!token) {
    rejectUpgrade(socket, 401, "token_missing");
    return;
  }

  let claims;
  try {
    claims = verifyEphemeralToken(token, {
      secret: config.hmacSecret,
      issuer: config.tokenIssuer,
      audience: config.tokenAudience,
      allowedModels: config.allowedModels,
      maxTtlSeconds: config.tokenMaxTtlSeconds,
      clockSkewSeconds: config.tokenClockSkewSeconds,
    });
  } catch (error) {
    const reason =
      error instanceof TokenError ? `token_${error.code}` : "token_invalid";
    rejectUpgrade(socket, 401, reason);
    return;
  }

  if (claims.origin && claims.origin !== origin) {
    rejectUpgrade(socket, 403, "token_origin_mismatch");
    return;
  }

  pruneUsedTokens();
  if (config.tokenSingleUse && usedTokenIds.has(claims.jti)) {
    rejectUpgrade(socket, 401, "token_replayed");
    return;
  }

  const ip = getClientIp(request);
  if ((connectionsByIp.get(ip) || 0) >= config.maxConnectionsPerIp) {
    rejectUpgrade(socket, 429, "connection_limit");
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (client) => {
    if (config.tokenSingleUse) {
      usedTokenIds.set(claims.jti, claims.expiresAt);
    }
    webSocketServer.emit("connection", client, request, { claims, ip });
  });
});

const tokenCleanup = setInterval(pruneUsedTokens, 60_000);
tokenCleanup.unref();

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", "gateway.shutdown", { signal });
  clearInterval(tokenCleanup);

  for (const connection of connections) {
    closeSocket(connection, 1001, "service restarting");
  }

  httpServer.close((error) => {
    if (error) {
      log("error", "gateway.shutdown_error");
      process.exitCode = 1;
    }
  });

  setTimeout(() => process.exit(process.exitCode || 0), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

httpServer.listen(config.port, config.host, () => {
  log("info", "gateway.started", {
    host: config.host,
    port: config.port,
    runtime: config.nodeEnv,
  });
});
