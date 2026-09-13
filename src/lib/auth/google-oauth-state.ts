import { randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "nutriopus-google-calendar-oauth";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleOAuthState = {
  state: string;
  nutritionistId: string;
  tenantSlug: string;
};

/**
 * Binds a Google OAuth callback to the browser session that initiated it.
 * The random value goes to Google as `state`; its tenant context remains in
 * an HttpOnly, short-lived cookie and is never trusted from the query string.
 */
export function createGoogleOAuthState(
  nutritionistId: string,
  tenantSlug: string
): GoogleOAuthState {
  return {
    state: randomBytes(32).toString("base64url"),
    nutritionistId,
    tenantSlug,
  };
}

export function serializeGoogleOAuthState(value: GoogleOAuthState): string {
  return JSON.stringify(value);
}

export function parseGoogleOAuthState(value: string | undefined): GoogleOAuthState | null {
  if (!value || value.length > 2_000) return null;

  try {
    const parsed = JSON.parse(value) as Partial<GoogleOAuthState>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.nutritionistId !== "string" ||
      typeof parsed.tenantSlug !== "string" ||
      !parsed.state ||
      !parsed.nutritionistId ||
      !parsed.tenantSlug
    ) {
      return null;
    }

    return {
      state: parsed.state,
      nutritionistId: parsed.nutritionistId,
      tenantSlug: parsed.tenantSlug,
    };
  } catch {
    return null;
  }
}

export function matchesGoogleOAuthState(
  expected: GoogleOAuthState | null,
  received: string | null
): boolean {
  if (!expected || !received) return false;

  const expectedValue = Buffer.from(expected.state);
  const receivedValue = Buffer.from(received);
  return expectedValue.length === receivedValue.length
    && timingSafeEqual(expectedValue, receivedValue);
}
