import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  clearSession(response);
  return response;
}
