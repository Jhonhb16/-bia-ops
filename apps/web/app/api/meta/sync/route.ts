import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncMetaClient } from "@/lib/meta-api";
import { syncMetaMetrics } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "expert") {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as { clientId?: string };
  if (!body.clientId?.trim()) {
    return NextResponse.json({ ok: false, error: "clientId es obligatorio." }, { status: 400 });
  }

  try {
    const result = await syncMetaClient(body.clientId);
    const updated = syncMetaMetrics(body.clientId, result);
    return NextResponse.json({ ok: true, mode: result.mode, ...updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al sincronizar.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
