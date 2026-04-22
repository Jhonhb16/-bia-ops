import { NextRequest, NextResponse } from "next/server";
import { addClient, type ClientFormData } from "@/lib/data-store";
import type { Platform, PlanType } from "@bia-ops/shared";

const ALLOWED_ORIGINS = [
  "https://jhonhb16.github.io",
  "https://biagency.site",
  "http://localhost:3000"
];

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.find((o) => origin?.startsWith(o)) ?? ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Intake-Token"
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  const token = request.headers.get("X-Intake-Token");
  if (process.env.INTAKE_SECRET && token !== process.env.INTAKE_SECRET) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400, headers });
  }

  const business_name = String(body.negocio ?? "").trim();
  const contact_name = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();

  if (!business_name || !contact_name || !email || !whatsapp) {
    return NextResponse.json({ ok: false, error: "Faltan campos obligatorios." }, { status: 400, headers });
  }

  const rawPlan = String(body.plan ?? "").toLowerCase();
  const plan_type: PlanType = rawPlan === "escalado" ? "escalado" : rawPlan === "enterprise" ? "enterprise" : "sprint";
  const plan_price = plan_type === "sprint" ? 280 : plan_type === "escalado" ? 650 : 0;

  const platformsRaw = String(body.plataformas ?? "").toLowerCase();
  const active_platforms: Platform[] = [];
  if (platformsRaw.includes("meta")) active_platforms.push("meta");
  if (platformsRaw.includes("google")) active_platforms.push("google");
  if (platformsRaw.includes("tiktok")) active_platforms.push("tiktok");

  const accesos = String(body.accesos ?? "").toLowerCase();

  const data: ClientFormData = {
    business_name,
    contact_name,
    email,
    whatsapp,
    country: String(body.pais ?? "Colombia"),
    plan_type,
    plan_price,
    business_type: String(body.tipo_negocio ?? ""),
    category: String(body.categoria ?? ""),
    active_platforms,
    website: String(body.website ?? ""),
    product_description: String(body.producto ?? ""),
    ideal_client: String(body.cliente_ideal ?? ""),
    monthly_sales_range: String(body.ventas_mes ?? ""),
    monthly_ad_spend_range: String(body.inversion_pauta ?? ""),
    current_roas: parseFloat(String(body.roas_actual ?? "0")) || 0,
    main_goal: String(body.objetivo_principal ?? ""),
    time_horizon: String(body.horizonte ?? ""),
    main_problem: String(body.mayor_problema ?? ""),
    has_stock: String(body.stock ?? "").toLowerCase().includes("amplio"),
    has_meta_access: accesos.includes("meta"),
    has_google_access: accesos.includes("google"),
    has_analytics: accesos.includes("analytics"),
    has_shopify: accesos.includes("shopify") || accesos.includes("woocommerce"),
    has_pixel: accesos.includes("pixel"),
    has_conversion_data: accesos.includes("conversion"),
    has_catalog: accesos.includes("catalog"),
    has_creative_assets: accesos.includes("imagen"),
    previous_agency_experience: String(body.agencia_previa ?? ""),
    how_found_us: String(body.como_llego ?? "organico"),
    additional_notes: String(body.notas ?? ""),
    briefing_complete: true
  };

  try {
    const result = await addClient(data);
    return NextResponse.json({
      ok: true,
      clientId: result.client.id,
      accessToken: result.client.access_token
    }, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers });
  }
}
