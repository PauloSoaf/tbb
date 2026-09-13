import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createLogoutCookie } from "@/lib/auth/cookies";

export async function POST() {
  const cookieStore = await cookies();
  const logoutCookie = createLogoutCookie();
  cookieStore.set(logoutCookie);

  return NextResponse.json({ success: true });
}
