import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveAlert } from "@/lib/data-store";

export async function POST(request: NextRequest, { params }: { params: { alertId: string } }) {
  const session = getSession();
  if (!session || session.role !== "expert") {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as { note?: string };
  if (!body.note?.trim()) {
    return NextResponse.json({ ok: false, error: "La nota del experto es obligatoria." }, { status: 400 });
  }

  try {
    const alert = await resolveAlert(params.alertId, session.userId, body.note.trim());
    if (!alert) {
      return NextResponse.json({ ok: false, error: "Alerta no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, alert });
  } catch {
    return NextResponse.json({ ok: false, error: "Alerta no encontrada." }, { status: 404 });
  }
}
