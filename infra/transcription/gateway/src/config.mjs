function readInteger(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }

  return value;
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function readJsonStringArray(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must be a JSON array of strings`);
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new Error(`${name} must be a non-empty JSON array of strings`);
  }

  return [...new Set(parsed)];
}

function readUrl(name, fallback, protocols) {
  const raw = process.env[name] || fallback;
  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}`);
  }

  return url.toString();
}

export function loadConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const hmacSecret = process.env.TRANSCRIPTION_GATEWAY_HMAC_SECRET || "";
  const speachesApiKey = process.env.SPEACHES_API_KEY || "";
  const defaultModel =
    process.env.TRANSCRIPTION_DEFAULT_MODEL ||
    "deepdml/faster-whisper-large-v3-turbo-ct2";
  const fallbackModel =
    process.env.TRANSCRIPTION_FALLBACK_MODEL ||
    "Systran/faster-whisper-small";
  const allowedModels = readJsonStringArray("TRANSCRIPTION_ALLOWED_MODELS", [
    defaultModel,
    fallbackModel,
  ]);
  const allowedOrigins = readJsonStringArray("GATEWAY_ALLOWED_ORIGINS", [
    "http://localhost:3000",
  ]);

  if (Buffer.byteLength(hmacSecret, "utf8") < 32) {
    throw new Error(
      "TRANSCRIPTION_GATEWAY_HMAC_SECRET must contain at least 32 bytes",
    );
  }

  if (Buffer.byteLength(speachesApiKey, "utf8") < 24) {
    throw new Error("SPEACHES_API_KEY must contain at least 24 bytes");
  }

  if (!allowedModels.includes(defaultModel) || !allowedModels.includes(fallbackModel)) {
    throw new Error(
      "TRANSCRIPTION_ALLOWED_MODELS must include the default and fallback models",
    );
  }

  if (nodeEnv === "production" && allowedOrigins.includes("*")) {
    throw new Error("GATEWAY_ALLOWED_ORIGINS cannot contain * in production");
  }

  const logLevel = process.env.GATEWAY_LOG_LEVEL || "info";
  if (!["debug", "info", "warn", "error"].includes(logLevel)) {
    throw new Error("GATEWAY_LOG_LEVEL must be debug, info, warn, or error");
  }

  return Object.freeze({
    nodeEnv,
    host: process.env.GATEWAY_HOST || "0.0.0.0",
    port: readInteger("GATEWAY_PORT", 8080, { min: 1, max: 65535 }),
    logLevel,
    allowedOrigins,
    requireOrigin: readBoolean("GATEWAY_REQUIRE_ORIGIN", true),
    allowQueryToken: readBoolean("GATEWAY_ALLOW_QUERY_TOKEN", false),
    trustProxy: readBoolean("GATEWAY_TRUST_PROXY", false),
    tokenIssuer: process.env.GATEWAY_TOKEN_ISSUER || "nutriopus",
    tokenAudience:
      process.env.GATEWAY_TOKEN_AUDIENCE || "transcription-gateway",
    tokenMaxTtlSeconds: readInteger("GATEWAY_TOKEN_MAX_TTL_SECONDS", 120, {
      min: 15,
      max: 600,
    }),
    tokenClockSkewSeconds: readInteger(
      "GATEWAY_TOKEN_CLOCK_SKEW_SECONDS",
      5,
      { min: 0, max: 30 },
    ),
    tokenSingleUse: readBoolean("GATEWAY_TOKEN_SINGLE_USE", true),
    maxConnectionsPerIp: readInteger("GATEWAY_MAX_CONNECTIONS_PER_IP", 4, {
      min: 1,
      max: 100,
    }),
    maxMessageBytes: readInteger("GATEWAY_MAX_MESSAGE_BYTES", 262_144, {
      min: 16_384,
      max: 2_097_152,
    }),
    maxAudioChunkBytes: readInteger(
      "GATEWAY_MAX_AUDIO_CHUNK_BYTES",
      131_072,
      { min: 8_192, max: 1_048_576 },
    ),
    maxMessagesPerSecond: readInteger(
      "GATEWAY_MAX_MESSAGES_PER_SECOND",
      20,
      { min: 1, max: 200 },
    ),
    maxBytesPerSecond: readInteger(
      "GATEWAY_MAX_BYTES_PER_SECOND",
      1_048_576,
      { min: 65_536, max: 16_777_216 },
    ),
    maxPendingBytes: readInteger("GATEWAY_MAX_PENDING_BYTES", 524_288, {
      min: 16_384,
      max: 4_194_304,
    }),
    idleTimeoutSeconds: readInteger("GATEWAY_IDLE_TIMEOUT_SECONDS", 45, {
      min: 15,
      max: 600,
    }),
    maxSessionSeconds: readInteger("GATEWAY_MAX_SESSION_SECONDS", 14_400, {
      min: 60,
      max: 28_800,
    }),
    heartbeatIntervalSeconds: readInteger(
      "GATEWAY_HEARTBEAT_INTERVAL_SECONDS",
      20,
      { min: 5, max: 60 },
    ),
    upstreamConnectTimeoutMs: readInteger(
      "GATEWAY_UPSTREAM_CONNECT_TIMEOUT_MS",
      15_000,
      { min: 1_000, max: 60_000 },
    ),
    metricsBearerToken: process.env.GATEWAY_METRICS_BEARER_TOKEN || "",
    hmacSecret,
    defaultModel,
    fallbackModel,
    allowedModels,
    defaultLanguage: process.env.TRANSCRIPTION_LANGUAGE || "pt",
    speachesWsUrl: readUrl(
      "SPEACHES_WS_URL",
      "ws://speaches:8000/v1/realtime",
      ["ws:", "wss:"],
    ),
    speachesHealthUrl: readUrl(
      "SPEACHES_HEALTH_URL",
      "http://speaches:8000/health",
      ["http:", "https:"],
    ),
    speachesApiKey,
  });
}
