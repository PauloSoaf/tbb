import { SignJWT, jwtVerify } from "jose";

export interface PatientSessionPayload {
  patientAccountId: string;
  patientId: string;
  nutritionistId: string;
  nutritionistSlug: string;
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

const ISSUER = "nutriopus-patient";
const AUDIENCE = "nutriopus-patient-portal";
const EXPIRATION = "7d";

export async function createPatientSession(
  payload: PatientSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRATION)
    .sign(SECRET_KEY);
}

export async function verifyPatientSession(
  token: string
): Promise<PatientSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as unknown as PatientSessionPayload;
  } catch {
    return null;
  }
}
