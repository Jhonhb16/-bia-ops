import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "./lib/session-core";

const PUBLIC_PREFIXES = ["/auth/login", "/acceso", "/api/auth", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const session = decodeSession(request.cookies.get("bia_ops_session")?.value);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(routeForRole(session), request.url));
  }

  if (isPublic || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname.startsWith("/dashboard/ceo") && session.role !== "ceo") {
    return NextResponse.redirect(new URL(routeForRole(session), request.url));
  }

  if (pathname.startsWith("/dashboard/expert") && session.role !== "expert") {
    return NextResponse.redirect(new URL(routeForRole(session), request.url));
  }

  if (pathname.startsWith("/dashboard/cliente")) {
    const [, , , clientId] = pathname.split("/");
    if (session.role !== "client" || !session.clientId || clientId !== session.clientId) {
      return NextResponse.redirect(new URL(routeForRole(session), request.url));
    }
  }

  return NextResponse.next();
}

function routeForRole(session: ReturnType<typeof decodeSession>) {
  if (!session) return "/auth/login";
  if (session.role === "ceo") return "/dashboard/ceo";
  if (session.role === "expert") return "/dashboard/expert";
  return `/dashboard/cliente/${session.clientId ?? "demo-fit"}`;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
