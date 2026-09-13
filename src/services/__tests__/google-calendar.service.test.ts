import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getGoogleOAuthUrl", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.nutriopus.com.br");
  });

  it("returns a Google OAuth URL", async () => {
    const { getGoogleOAuthUrl } = await import("../google-calendar.service");
    const url = getGoogleOAuthUrl("nutri-001");
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
  });

  it("preserves the provided opaque OAuth state param", async () => {
    const { getGoogleOAuthUrl } = await import("../google-calendar.service");
    const url = getGoogleOAuthUrl("opaque-state-value");
    expect(new URL(url).searchParams.get("state")).toBe("opaque-state-value");
  });

  it("includes calendar scopes", async () => {
    const { getGoogleOAuthUrl } = await import("../google-calendar.service");
    const url = getGoogleOAuthUrl("nutri-001");
    const scope = new URL(url).searchParams.get("scope") ?? "";
    expect(scope).toContain("calendar.events");
    expect(scope).toContain("calendar.readonly");
  });

  it("requests offline access with consent prompt", async () => {
    const { getGoogleOAuthUrl } = await import("../google-calendar.service");
    const url = getGoogleOAuthUrl("nutri-001");
    const params = new URL(url).searchParams;
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("prompt")).toBe("consent");
    expect(params.get("response_type")).toBe("code");
  });

  it("includes redirect_uri with /api/auth/google/callback path", async () => {
    const { getGoogleOAuthUrl } = await import("../google-calendar.service");
    const url = getGoogleOAuthUrl("nutri-001");
    const redirectUri = new URL(url).searchParams.get("redirect_uri") ?? "";
    expect(redirectUri).toContain("/api/auth/google/callback");
  });
});
