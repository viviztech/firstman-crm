import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { PORTAL_SESSION_COOKIE, PORTAL_SESSION_MAX_AGE_SECONDS } from "@/lib/portal-session";
import { createPortalSession, verifyPortalLoginToken } from "@/services/portal-auth";

/** Public route (no staff session check) — the single-use token is the sole authorization, same posture as the invoice-PDF signed link. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=missing", request.url));
  }

  const verified = await verifyPortalLoginToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", request.url));
  }

  const rawSession = await createPortalSession(verified.clientId);

  const response = NextResponse.redirect(new URL("/portal/dashboard", request.url));
  response.cookies.set(PORTAL_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
