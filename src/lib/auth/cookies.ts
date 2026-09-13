import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./session";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

const COOKIE_NAME = "nutriopus-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function createSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function createLogoutCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  try {
    const sessionTokenHash = createHash("sha256").update(token).digest("hex");
    const userSession = await prisma.userSession.findUnique({
      where: { sessionTokenHash },
      select: { id: true, status: true, expiresAt: true, lastSeenAt: true },
    });

    if (userSession) {
      if (userSession.status !== "ACTIVE" || userSession.expiresAt < new Date()) {
        return null; // Session is revoked or expired
      }
      // Throttle updating lastSeenAt to at most once every 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!userSession.lastSeenAt || userSession.lastSeenAt < fiveMinutesAgo) {
        prisma.userSession
          .update({
            where: { id: userSession.id },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => {});
      }
    }
  } catch {
    // Transient DB error or legacy token: fallback to JWT validity
  }

  return payload;
}
