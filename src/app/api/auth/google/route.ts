import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
  createGoogleOAuthState,
  serializeGoogleOAuthState,
} from "@/lib/auth/google-oauth-state";
import { AuthorizationError, requirePermission } from "@/lib/tenancy/requirePermission";
import { getGoogleOAuthUrl } from "@/services/google-calendar.service";

function redirectToGoogleCalendarSettings(
  req: NextRequest,
  tenantSlug: string,
  googleError?: string
) {
  const url = new URL(`/dashboard/${tenantSlug}/config`, req.url);
  if (googleError) url.searchParams.set("googleError", googleError);
  url.hash = "google-calendar";
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await requirePermission("settings", "editClinic", session.nutritionistSlug, {
      throwOnFailure: true,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.redirect(new URL(`/dashboard/${session.nutritionistSlug}`, req.url));
    }
    throw error;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirectToGoogleCalendarSettings(req, session.nutritionistSlug, "not-configured");
  }

  const state = createGoogleOAuthState(session.nutritionistId, session.nutritionistSlug);
  const response = NextResponse.redirect(getGoogleOAuthUrl(state.state));
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: serializeGoogleOAuthState(state),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/api/auth/google",
  });
  return response;
}
