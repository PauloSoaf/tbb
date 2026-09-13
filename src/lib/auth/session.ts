import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  userId: string;
  nutritionistId: string;
  nutritionistSlug: string;
  role: string;
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

const ISSUER = "nutriopus";
const AUDIENCE = "nutriopus-app";
const EXPIRATION = "7d";

export async function createSession(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRATION)
    .sign(SECRET_KEY);
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
