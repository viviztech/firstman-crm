import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Everything not listed here is public (marketing site + auth pages) — the CRM's own
 * pages opt into protection explicitly rather than the middleware defaulting to "protect
 * everything except an allowlist", since the public marketing site now lives at "/" and
 * sibling routes in this same app.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/enquiries",
  "/clients",
  "/orders",
  "/catalog",
  "/compliance",
  "/invoices",
  "/expenses",
  "/reports",
  "/settings",
];
const AUTH_PATHS = ["/login"];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Signed-in staff hitting the login page or the marketing homepage land on the dashboard
  // instead — the marketing site at "/" is for signed-out visitors.
  if (sessionCookie && (isAuthPath || pathname === "/")) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
