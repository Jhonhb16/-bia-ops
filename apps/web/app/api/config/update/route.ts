import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "CLAUDE_API_KEY",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_EXPERT_CHAT_ID",
  "META_APP_ID",
  "META_APP_SECRET"
]);

function getEnvPath(): string {
  // Next.js cwd is the app directory (apps/web)
  const candidates = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env")
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

function updateEnvFile(path: string, key: string, value: string): void {
  let content = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const lines = content.split("\n");
  const idx = lines.findIndex((line) => line.startsWith(`${key}=`) || line.startsWith(`${key} =`));
  const newLine = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    lines.push(newLine);
  }
  writeFileSync(path, lines.join("\n"), "utf-8");
}

export async function POST(request: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ceo") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as { key?: string; value?: string };
  const { key, value } = body;

  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "Clave no permitida." }, { status: 400 });
  }
  if (value === undefined) {
    return NextResponse.json({ ok: false, error: "Valor requerido." }, { status: 400 });
  }

  try {
    const envPath = getEnvPath();
    updateEnvFile(envPath, key, value.trim());

    // Update running process env so it takes effect without full restart where possible
    process.env[key] = value.trim();

    // Restart PM2 in background so current response completes
    exec("pm2 restart bia-ops --update-env", () => {/* fire and forget */});

    return NextResponse.json({ ok: true, message: "Clave actualizada. El sistema se reiniciara en segundos." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al escribir configuracion.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
