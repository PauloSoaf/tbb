import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

export interface SessionPayload {
  userId: string;
  workspaceId: string;
  sessionId: string;
}
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET deve conter pelo menos 32 caracteres.");
  return new TextEncoder().encode(value);
}
export async function createSession(payload: Omit<SessionPayload, "sessionId"> & { sessionId?: string }) {
  const sessionId = payload.sessionId ?? randomUUID();
  return new SignJWT({ userId: payload.userId, workspaceId: payload.workspaceId })
    .setProtectedHeader({ alg: "HS256" }).setJti(sessionId)
    .setIssuedAt().setIssuer("tbb").setAudience("tbb-app")
    .setExpirationTime(`${SESSION_MAX_AGE}s`).sign(secret());
}
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"], issuer: "tbb", audience: "tbb-app",
    });
    if (typeof payload.userId !== "string" || !payload.userId ||
        typeof payload.workspaceId !== "string" || !payload.workspaceId ||
        typeof payload.jti !== "string" || !payload.jti) return null;
    return { userId: payload.userId, workspaceId: payload.workspaceId, sessionId: payload.jti };
  } catch { return null; }
}
