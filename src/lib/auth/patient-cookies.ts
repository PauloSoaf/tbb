import { cookies } from "next/headers";
import { verifyPatientSession, type PatientSessionPayload } from "./patient-session";

const COOKIE_NAME = "nutriopus-patient-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function createPatientSessionCookie(token: string) {
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

export function createPatientLogoutCookie() {
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

export async function getPatientSessionFromCookies(): Promise<PatientSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPatientSession(token);
}
