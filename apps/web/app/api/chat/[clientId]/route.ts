import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addChatMessage, addExpertChatMessage, getClientDashboard } from "@/lib/data-store";

export async function GET(_request: NextRequest, { params }: { params: { clientId: string } }) {
  const session = getSession();
  if (!canAccessClient(session, params.clientId)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const dashboard = await getClientDashboard(params.clientId);
  if (!dashboard) return NextResponse.json({ ok: false, error: "Cliente no encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, messages: dashboard.messages });
}

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
  const session = getSession();
  if (!canAccessClient(session, params.clientId)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as { content?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ ok: false, error: "El mensaje no puede estar vacio." }, { status: 400 });
  }

  const messages =
    session?.role === "expert"
      ? addExpertChatMessage(params.clientId, body.content.trim(), session.userId)
      : addChatMessage(params.clientId, body.content.trim());

  return NextResponse.json({ ok: true, messages });
}

function canAccessClient(session: ReturnType<typeof getSession>, clientId: string) {
  if (!session) return false;
  if (session.role === "expert") return true;
  if (session.role === "client" && session.clientId === clientId) return true;
  return false;
}
