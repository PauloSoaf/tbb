import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  matchesGoogleOAuthState,
  parseGoogleOAuthState,
} from "@/lib/auth/google-oauth-state";
import { AuthorizationError, requirePermission } from "@/lib/tenancy/requirePermission";
import { exchangeCodeForTokens } from "@/services/google-calendar.service";

function clearGoogleOAuthState(response: NextResponse) {
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    maxAge: 0,
    path: "/api/auth/google",
  });
  return response;
}

function redirectToGoogleCalendarSettings(
  req: NextRequest,
  tenantSlug: string,
  options?: { googleConnected?: string; googleError?: string }
) {
  const url = new URL(`/dashboard/${tenantSlug}/config`, req.url);
  if (options?.googleConnected) url.searchParams.set("googleConnected", options.googleConnected);
  if (options?.googleError) url.searchParams.set("googleError", options.googleError);
  url.hash = "google-calendar";
  return clearGoogleOAuthState(NextResponse.redirect(url));
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  const pendingState = parseGoogleOAuthState(req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value);
  const receivedState = req.nextUrl.searchParams.get("state");

  if (!session) {
    return clearGoogleOAuthState(NextResponse.redirect(new URL("/login", req.url)));
  }

  if (
    !pendingState
    || !matchesGoogleOAuthState(pendingState, receivedState)
    || pendingState.nutritionistId !== session.nutritionistId
    || pendingState.tenantSlug !== session.nutritionistSlug
  ) {
    return redirectToGoogleCalendarSettings(req, session.nutritionistSlug, { googleError: "2" });
  }

  try {
    await requirePermission("settings", "editClinic", session.nutritionistSlug, {
      throwOnFailure: true,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return clearGoogleOAuthState(
        NextResponse.redirect(new URL(`/dashboard/${session.nutritionistSlug}`, req.url))
      );
    }
    throw error;
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError || !code) {
    return redirectToGoogleCalendarSettings(req, pendingState.tenantSlug, { googleError: "1" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.nutritionist.update({
      where: { id: pendingState.nutritionistId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiresAt: expiresAt,
      },
    });

    return redirectToGoogleCalendarSettings(req, pendingState.tenantSlug, {
      googleConnected: "1",
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return redirectToGoogleCalendarSettings(req, pendingState.tenantSlug, { googleError: "2" });
  }
}
