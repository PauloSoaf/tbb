import { randomUUID } from "node:crypto";
import { mintEphemeralToken } from "../src/token.mjs";

function readArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must use --name value pairs");
    }
    args.set(key.slice(2), value);
  }
  return args;
}

const args = readArgs(process.argv.slice(2));
const secret = process.env.TRANSCRIPTION_GATEWAY_HMAC_SECRET || "";
if (Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error("TRANSCRIPTION_GATEWAY_HMAC_SECRET must contain 32 bytes");
}

for (const required of ["subject", "tenant", "appointment", "participant"]) {
  if (!args.get(required)) throw new Error(`Missing --${required}`);
}

const maxTtl = Number(process.env.GATEWAY_TOKEN_MAX_TTL_SECONDS || "120");
const ttl = Number(args.get("ttl") || "60");
if (!Number.isInteger(ttl) || ttl < 15 || ttl > maxTtl) {
  throw new Error(`--ttl must be an integer between 15 and ${maxTtl}`);
}

const now = Math.floor(Date.now() / 1000);
const claims = {
  v: 1,
  iss: process.env.GATEWAY_TOKEN_ISSUER || "nutriopus",
  aud: process.env.GATEWAY_TOKEN_AUDIENCE || "transcription-gateway",
  sub: args.get("subject"),
  tenantId: args.get("tenant"),
  appointmentId: args.get("appointment"),
  participantId: args.get("participant"),
  scope: ["transcription:stream"],
  model:
    args.get("model") ||
    process.env.TRANSCRIPTION_DEFAULT_MODEL ||
    "deepdml/faster-whisper-large-v3-turbo-ct2",
  language: args.get("language") || process.env.TRANSCRIPTION_LANGUAGE || "pt",
  iat: now,
  nbf: now,
  exp: now + ttl,
  jti: randomUUID(),
};

if (args.get("origin")) claims.origin = args.get("origin");

process.stdout.write(`${mintEphemeralToken(claims, secret)}\n`);
