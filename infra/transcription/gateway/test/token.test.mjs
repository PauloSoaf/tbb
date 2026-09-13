import assert from "node:assert/strict";
import test from "node:test";
import { mintEphemeralToken, TokenError, verifyEphemeralToken } from "../src/token.mjs";

const secret = "test-secret-with-more-than-thirty-two-bytes";
const options = {
  secret,
  issuer: "nutriopus",
  audience: "transcription-gateway",
  allowedModels: ["default-model", "fallback-model"],
  maxTtlSeconds: 120,
  clockSkewSeconds: 0,
  nowSeconds: 1_000,
};

function claims(overrides = {}) {
  return {
    v: 1,
    iss: "nutriopus",
    aud: "transcription-gateway",
    sub: "user-1",
    tenantId: "tenant-1",
    appointmentId: "appointment-1",
    participantId: "participant-1",
    scope: ["transcription:stream"],
    model: "default-model",
    language: "pt",
    iat: 990,
    nbf: 990,
    exp: 1_050,
    jti: "token-1",
    ...overrides,
  };
}

test("verifies a valid scoped token", () => {
  const token = mintEphemeralToken(claims(), secret);
  const verified = verifyEphemeralToken(token, options);
  assert.equal(verified.tenantId, "tenant-1");
  assert.equal(verified.model, "default-model");
});

test("rejects a tampered payload", () => {
  const token = mintEphemeralToken(claims(), secret);
  const [payload, signature] = token.split(".");
  const tampered = `${payload.slice(0, -1)}A.${signature}`;

  assert.throws(
    () => verifyEphemeralToken(tampered, options),
    (error) => error instanceof TokenError && error.code === "invalid_signature",
  );
});

test("rejects expired and overlong tokens", () => {
  const expired = mintEphemeralToken(claims({ exp: 999 }), secret);
  assert.throws(
    () => verifyEphemeralToken(expired, options),
    (error) => error instanceof TokenError && error.code === "expired",
  );

  const overlong = mintEphemeralToken(claims({ iat: 800, exp: 1_050 }), secret);
  assert.throws(
    () => verifyEphemeralToken(overlong, options),
    (error) => error instanceof TokenError && error.code === "invalid_ttl",
  );
});

test("rejects unauthorized scope and model", () => {
  const invalidScope = mintEphemeralToken(claims({ scope: ["read"] }), secret);
  assert.throws(
    () => verifyEphemeralToken(invalidScope, options),
    (error) => error instanceof TokenError && error.code === "invalid_scope",
  );

  const invalidModel = mintEphemeralToken(claims({ model: "other-model" }), secret);
  assert.throws(
    () => verifyEphemeralToken(invalidModel, options),
    (error) => error instanceof TokenError && error.code === "model_not_allowed",
  );
});
