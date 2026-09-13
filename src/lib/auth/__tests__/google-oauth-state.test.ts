import { describe, expect, it } from "vitest";
import {
  createGoogleOAuthState,
  matchesGoogleOAuthState,
  parseGoogleOAuthState,
  serializeGoogleOAuthState,
} from "../google-oauth-state";

describe("Google OAuth state", () => {
  it("creates a non-empty opaque value while retaining the trusted tenant context", () => {
    const value = createGoogleOAuthState("nutritionist_123", "clinica-ana");

    expect(value.state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(value.state.length).toBeGreaterThanOrEqual(32);
    expect(value.nutritionistId).toBe("nutritionist_123");
    expect(value.tenantSlug).toBe("clinica-ana");
  });

  it("round-trips a valid cookie payload and rejects malformed payloads", () => {
    const state = createGoogleOAuthState("nutritionist_123", "clinica-ana");

    expect(parseGoogleOAuthState(serializeGoogleOAuthState(state))).toEqual(state);
    expect(parseGoogleOAuthState("not-json")).toBeNull();
    expect(parseGoogleOAuthState('{"state":"x"}')).toBeNull();
  });

  it("matches only the original callback state", () => {
    const state = createGoogleOAuthState("nutritionist_123", "clinica-ana");

    expect(matchesGoogleOAuthState(state, state.state)).toBe(true);
    expect(matchesGoogleOAuthState(state, `${state.state}other`)).toBe(false);
    expect(matchesGoogleOAuthState(null, state.state)).toBe(false);
  });
});
