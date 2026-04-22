import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { getClientByToken, getUserById } from "@/lib/data-store";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: tokenRows } = await supabase.rpc("verify_client_access_token", { p_raw_token: params.token });
    const row = (tokenRows as Array<{ client_id: string }> | null)?.[0];
    if (!row) {
      return NextResponse.redirect(new URL("/auth/login?error=token", appUrl));
    }
    const { data: clientRow } = await supabase.from("clients").select("id, email").eq("id", row.client_id).single();
    if (!clientRow) {
      return NextResponse.redirect(new URL("/auth/login?error=token", appUrl));
    }
    const response = NextResponse.redirect(new URL(`/dashboard/cliente/${clientRow.id}`, appUrl));
    setSession(response, {
      userId: `client-${clientRow.id}`,
      role: "client",
      email: clientRow.email as string,
      clientId: clientRow.id as string
    });
    return response;
  }

  // Demo fallback
  const client = getClientByToken(params.token);
  if (!client) {
    return NextResponse.redirect(new URL("/auth/login?error=token", appUrl));
  }
  const user = client.user_id ? getUserById(client.user_id) : null;
  const response = NextResponse.redirect(new URL(`/dashboard/cliente/${client.id}`, appUrl));
  setSession(response, {
    userId: user?.id ?? `client-${client.id}`,
    role: "client",
    email: client.email,
    clientId: client.id
  });
  return response;
}
