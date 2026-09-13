import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifySession, SESSION_MAX_AGE } from "./session";

export const COOKIE_NAME = "tbb-session";
export function hashSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function createSessionCookie(token: string) {
  return { name: COOKIE_NAME, value: token, httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
    path: "/", maxAge: SESSION_MAX_AGE };
}
export function createLogoutCookie() { return { ...createSessionCookie(""), maxAge: 0 }; }
export async function getSessionFromCookies() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  // A signed token is insufficient: revocation and current account state are authoritative.
  const session = await prisma.userSession.findUnique({
    where: { sessionTokenHash: hashSessionToken(token) },
    include: { user: true, workspace: true },
  });
  if (!session || session.id !== payload.sessionId || session.userId !== payload.userId ||
      session.workspaceId !== payload.workspaceId || session.status !== "ACTIVE" ||
      session.expiresAt <= new Date() || !session.user.isActive || !session.workspace.isActive) return null;
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: session.userId } },
  });
  if (!membership?.isActive) return null;
  return { ...payload, user: session.user, workspace: session.workspace, membership };
}
