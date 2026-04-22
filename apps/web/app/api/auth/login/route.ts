import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string; role?: string };

  if (!body.email || !body.password || !body.role) {
    return NextResponse.json({ ok: false, error: "Credenciales incompletas." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password
    });

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas para este rol." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ ok: false, error: "Perfil no encontrado." }, { status: 401 });
    }

    if (profile.role !== body.role) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas para este rol." }, { status: 401 });
    }

    const redirectTo = profile.role === "ceo" ? "/dashboard/ceo" : profile.role === "expert" ? "/dashboard/expert" : "/";
    const response = NextResponse.json({ ok: true, redirectTo });
    setSession(response, {
      userId: profile.id,
      role: profile.role,
      email: profile.email
    });
    return response;
  }

  // Demo mode fallback
  const user = getUserByEmail(body.email);

  if (!user || user.role !== body.role || body.password !== "Bia2026!") {
    return NextResponse.json({ ok: false, error: "Credenciales invalidas para este rol." }, { status: 401 });
  }

  const redirectTo = user.role === "ceo" ? "/dashboard/ceo" : user.role === "expert" ? "/dashboard/expert" : "/";
  const response = NextResponse.json({ ok: true, redirectTo });
  setSession(response, {
    userId: user.id,
    role: user.role,
    email: user.email
  });
  return response;
}
