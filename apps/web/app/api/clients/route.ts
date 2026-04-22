import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addClient, type ClientFormData } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "expert") {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ClientFormData>;

  if (!body.business_name?.trim()) {
    return NextResponse.json({ ok: false, error: "El nombre del negocio es obligatorio." }, { status: 400 });
  }
  if (!body.contact_name?.trim()) {
    return NextResponse.json({ ok: false, error: "El nombre del contacto es obligatorio." }, { status: 400 });
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ ok: false, error: "El email es obligatorio." }, { status: 400 });
  }
  if (!body.plan_type) {
    return NextResponse.json({ ok: false, error: "El plan es obligatorio." }, { status: 400 });
  }

  const data: ClientFormData = {
    business_name: body.business_name.trim(),
    contact_name: body.contact_name.trim(),
    email: body.email.trim(),
    whatsapp: body.whatsapp?.trim() ?? "",
    country: body.country?.trim() ?? "Colombia",
    plan_type: body.plan_type,
    plan_price: body.plan_price ?? (body.plan_type === "sprint" ? 280 : body.plan_type === "escalado" ? 650 : 0),
    business_type: body.business_type?.trim() ?? "",
    category: body.category?.trim() ?? "",
    active_platforms: body.active_platforms ?? [],
    meta_ad_account_id: body.meta_ad_account_id?.trim(),
    additional_notes: body.additional_notes?.trim()
  };

  try {
    const result = await addClient(data);
    return NextResponse.json({ ok: true, client: result.client, onboarding: result.onboarding }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear cliente.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
