import { prisma } from "@/lib/prisma";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export function getGoogleOAuthUrl(oauthState: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: oauthState,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  return data;
}

export async function getValidAccessToken(nutritionistId: string): Promise<string | null> {
  const nutritionist = await prisma.nutritionist.findUnique({
    where: { id: nutritionistId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiresAt: true },
  });
  if (!nutritionist?.googleAccessToken || !nutritionist.googleRefreshToken) return null;

  const expiresAt = nutritionist.googleTokenExpiresAt;
  const isExpired = !expiresAt || expiresAt <= new Date(Date.now() + 60_000);

  if (!isExpired) return nutritionist.googleAccessToken;

  const refreshed = await refreshAccessToken(nutritionist.googleRefreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await prisma.nutritionist.update({
    where: { id: nutritionistId },
    data: { googleAccessToken: refreshed.access_token, googleTokenExpiresAt: newExpiresAt },
  });
  return refreshed.access_token;
}

export async function createCalendarEvent(
  nutritionistId: string,
  event: {
    summary: string;
    description?: string;
    startDateTime: Date;
    endDateTime: Date;
    attendeeEmail?: string;
  }
) {
  const token = await getValidAccessToken(nutritionistId);
  if (!token) return { success: false, error: "Google Calendar não conectado" };

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { id: nutritionistId },
    select: { googleCalendarId: true },
  });
  const calendarId = nutritionist?.googleCalendarId ?? "primary";

  const body = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startDateTime.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: event.endDateTime.toISOString(), timeZone: "America/Sao_Paulo" },
    ...(event.attendeeEmail ? { attendees: [{ email: event.attendeeEmail }] } : {}),
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: `Calendar API error: ${res.status}`, details: err };
  }
  const created = await res.json();
  return { success: true, eventId: created.id as string, htmlLink: created.htmlLink as string };
}

export async function disconnectGoogleCalendar(nutritionistId: string) {
  await prisma.nutritionist.update({
    where: { id: nutritionistId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
      googleCalendarId: null,
    },
  });
}
