import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  key: string;
  label: string;
  configured: boolean;
  status: "ok" | "error" | "unconfigured" | "checking";
  message: string;
  costEstimate: string;
  category: "ia" | "infra" | "integracion";
}

export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ceo") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const services: ServiceStatus[] = [];

  // Supabase
  const supabase = getSupabaseAdminClient();
  let supabaseStatus: "ok" | "error" = "error";
  let supabaseMsg = "No conectado";
  if (supabase) {
    try {
      const { error } = await supabase.from("clients").select("id").limit(1);
      supabaseStatus = error ? "error" : "ok";
      supabaseMsg = error ? error.message : "Conectado y respondiendo";
    } catch {
      supabaseMsg = "Error de conexion";
    }
  }
  services.push({
    key: "SUPABASE",
    label: "Supabase (Base de datos)",
    configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    status: process.env.NEXT_PUBLIC_SUPABASE_URL ? supabaseStatus : "unconfigured",
    message: process.env.NEXT_PUBLIC_SUPABASE_URL ? supabaseMsg : "URL no configurada",
    costEstimate: "US$ 25 / mes (Pro)",
    category: "infra"
  });

  // Claude
  const claudeKey = process.env.CLAUDE_API_KEY ?? "";
  let claudeStatus: "ok" | "error" | "unconfigured" = claudeKey ? "checking" : "unconfigured";
  let claudeMsg = claudeKey ? "Verificando..." : "API key no configurada";
  if (claudeKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01" }
      });
      claudeStatus = res.ok ? "ok" : "error";
      claudeMsg = res.ok ? "Key valida y activa" : `Error ${res.status}`;
    } catch {
      claudeStatus = "error";
      claudeMsg = "No se pudo conectar";
    }
  }
  services.push({
    key: "CLAUDE_API_KEY",
    label: "Claude AI (Anthropic)",
    configured: !!claudeKey,
    status: claudeStatus === "checking" ? "error" : claudeStatus,
    message: claudeMsg,
    costEstimate: "US$ 10–50 / mes (segun uso)",
    category: "ia"
  });

  // Gemini
  const geminiKey = process.env.GEMINI_API_KEY ?? "";
  services.push({
    key: "GEMINI_API_KEY",
    label: "Gemini AI (Google)",
    configured: !!geminiKey,
    status: geminiKey ? "ok" : "unconfigured",
    message: geminiKey ? "Key configurada" : "API key no configurada",
    costEstimate: "Gratis (tier generoso)",
    category: "ia"
  });

  // Resend
  const resendKey = process.env.RESEND_API_KEY ?? "";
  services.push({
    key: "RESEND_API_KEY",
    label: "Resend (Emails)",
    configured: !!resendKey,
    status: resendKey ? "ok" : "unconfigured",
    message: resendKey ? "Key configurada" : "Sin configurar — emails desactivados",
    costEstimate: "US$ 20 / mes",
    category: "integracion"
  });

  // Telegram
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  services.push({
    key: "TELEGRAM_BOT_TOKEN",
    label: "Telegram (Notificaciones)",
    configured: !!telegramToken,
    status: telegramToken ? "ok" : "unconfigured",
    message: telegramToken ? "Bot configurado" : "Sin configurar — alertas por Telegram desactivadas",
    costEstimate: "Gratis",
    category: "integracion"
  });

  // Meta
  const metaAppId = process.env.META_APP_ID ?? "";
  const metaSecret = process.env.META_APP_SECRET ?? "";
  services.push({
    key: "META",
    label: "Meta Ads API",
    configured: !!(metaAppId && metaSecret),
    status: metaAppId && metaSecret ? "ok" : "unconfigured",
    message: metaAppId && metaSecret ? "App configurada" : "Sin configurar — sincronizacion Meta desactivada",
    costEstimate: "Gratis",
    category: "integracion"
  });

  const totalCost = 25 + (claudeKey ? 30 : 0) + (resendKey ? 20 : 0);

  return NextResponse.json({ services, totalCost });
}
