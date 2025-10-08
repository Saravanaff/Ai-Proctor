import { NextRequest, NextResponse } from "next/server";

// Allow these exact paths without auth
const PUBLIC_PATHS = new Set<string>(["/Login", "/favicon.ico"]);
// Allow any path that starts with these prefixes (static assets, Next internals)
const STATIC_PREFIXES = ["/_next", "/static", "/public", "/images", "/assets"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function hasAuth(req: NextRequest) {
  // Only trust explicit cookies for this app or a Bearer header
  const authCookie = req.cookies.get("authToken")?.value || req.cookies.get("ai_proctor_auth")?.value;
  if (authCookie && authCookie.length > 0) return true;
  const authz = req.headers.get("authorization");
  if (authz && authz.toLowerCase().startsWith("bearer ") && authz.trim().length > 7) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public, static, and API routes
  if (isPublicPath(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // If authenticated, proceed
  if (hasAuth(req)) {
    return NextResponse.next();
  }

  // Otherwise, redirect to Login with redirect back URL
  const url = req.nextUrl.clone();
  url.pathname = "/Login";
  url.searchParams.set("redirect", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

// Run middleware for everything except Next internals, images, favicon, API, and Login
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|Login).*)"],
};
