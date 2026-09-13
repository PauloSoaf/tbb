import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const prettyPatientPortalMatch = pathname.match(/^\/portal\/([^/]+)\/paciente\/([^/]+)(?:\/(.*))?$/);
  if (prettyPatientPortalMatch) {
    const [, tenant, , rest = ""] = prettyPatientPortalMatch;
    const url = request.nextUrl.clone();
    url.pathname = rest ? `/portal/${tenant}/${rest}` : `/portal/${tenant}`;
    return NextResponse.rewrite(url);
  }

  // Only protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("nutriopus-session")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await verifySession(token);
    if (!session) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("nutriopus-session");
      return response;
    }
  }

  // Redirect from /login if already authenticated
  if (pathname === "/login") {
    const token = request.cookies.get("nutriopus-session")?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        if (session.role === "GLOBAL_ADMIN") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }

        return NextResponse.redirect(
          new URL(`/dashboard/${session.nutritionistSlug}`, request.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/portal/:tenant/paciente/:path*"],
};
