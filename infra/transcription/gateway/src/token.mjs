import { createHmac, timingSafeEqual } from "node:crypto";

const SAFE_ID_PATTERN = /^[A-Za-z0-9._:@/-]{1,256}$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z]{2})?$/;

export class TokenError extends Error {
  constructor(code, message = "Invalid ephemeral token") {
    super(message);
    this.name = "TokenError";
    this.code = code;
  }
}

function decodeBase64Url(value, code) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TokenError(code);
  }

  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new TokenError(code);
  }

  return decoded;
}

function requireSafeString(claims, name) {
  const value = claims[name];
  if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value)) {
    throw new TokenError(`invalid_${name}`);
  }
  return value;
}

function requireInteger(claims, name) {
  const value = claims[name];
  if (!Number.isSafeInteger(value)) {
    throw new TokenError(`invalid_${name}`);
  }
  return value;
}

export function verifyEphemeralToken(
  token,
  {
    secret,
    issuer,
    audience,
    allowedModels,
    maxTtlSeconds,
    clockSkewSeconds = 5,
    nowSeconds = Math.floor(Date.now() / 1000),
  },
) {
  if (typeof token !== "string" || token.length === 0 || token.length > 4096) {
    throw new TokenError("invalid_format");
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new TokenError("invalid_format");
  }

  const [encodedPayload, encodedSignature] = parts;
  const suppliedSignature = decodeBase64Url(encodedSignature, "invalid_signature");
  const expectedSignature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest();

  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new TokenError("invalid_signature");
  }

  let claims;
  try {
    claims = JSON.parse(
      decodeBase64Url(encodedPayload, "invalid_payload").toString("utf8"),
    );
  } catch (error) {
    if (error instanceof TokenError) throw error;
    throw new TokenError("invalid_payload");
  }

  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new TokenError("invalid_payload");
  }

  if (claims.v !== 1) throw new TokenError("unsupported_version");
  if (claims.iss !== issuer) throw new TokenError("invalid_issuer");
  if (claims.aud !== audience) throw new TokenError("invalid_audience");

  const subject = requireSafeString(claims, "sub");
  const tenantId = requireSafeString(claims, "tenantId");
  const appointmentId = requireSafeString(claims, "appointmentId");
  const participantId = requireSafeString(claims, "participantId");
  const jti = requireSafeString(claims, "jti");
  const issuedAt = requireInteger(claims, "iat");
  const expiresAt = requireInteger(claims, "exp");
  const notBefore =
    claims.nbf === undefined ? issuedAt : requireInteger(claims, "nbf");

  if (issuedAt > nowSeconds + clockSkewSeconds) {
    throw new TokenError("issued_in_future");
  }
  if (notBefore > nowSeconds + clockSkewSeconds) {
    throw new TokenError("not_active");
  }
  if (expiresAt <= nowSeconds - clockSkewSeconds) {
    throw new TokenError("expired");
  }
  if (expiresAt <= issuedAt || expiresAt - issuedAt > maxTtlSeconds) {
    throw new TokenError("invalid_ttl");
  }

  if (
    !Array.isArray(claims.scope) ||
    !claims.scope.includes("transcription:stream")
  ) {
    throw new TokenError("invalid_scope");
  }

  if (
    claims.model !== undefined &&
    (typeof claims.model !== "string" || !allowedModels.includes(claims.model))
  ) {
    throw new TokenError("model_not_allowed");
  }

  if (
    claims.language !== undefined &&
    (typeof claims.language !== "string" ||
      !LANGUAGE_PATTERN.test(claims.language))
  ) {
    throw new TokenError("invalid_language");
  }

  if (
    claims.origin !== undefined &&
    (typeof claims.origin !== "string" || claims.origin.length > 512)
  ) {
    throw new TokenError("invalid_origin");
  }

  return Object.freeze({
    subject,
    tenantId,
    appointmentId,
    participantId,
    jti,
    issuedAt,
    expiresAt,
    model: claims.model,
    language: claims.language,
    origin: claims.origin,
  });
}

export function mintEphemeralToken(claims, secret) {
  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}
