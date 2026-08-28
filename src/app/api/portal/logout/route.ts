import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-session";
import { revokePortalSession } from "@/services/portal-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (rawSession) {
    await revokePortalSession(rawSession);
  }

  const response = NextResponse.redirect(new URL("/portal/login", request.url));
  response.cookies.delete(PORTAL_SESSION_COOKIE);
  return response;
}
