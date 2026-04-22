import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, encodeSession, type BiaSession } from "./session-core";

export const SESSION_COOKIE = "bia_ops_session";

export function getSession(): BiaSession | null {
  return decodeSession(cookies().get(SESSION_COOKIE)?.value);
}

export function setSession(response: NextResponse, session: BiaSession) {
  response.cookies.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
