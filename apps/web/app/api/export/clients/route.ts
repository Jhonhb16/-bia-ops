import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCsvClients } from "@/lib/data-store";

export async function GET() {
  const session = getSession();
  if (!session || (session.role !== "ceo" && session.role !== "expert")) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const csv = await getCsvClients();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=bia-ops-clientes.csv"
    }
  });
}
