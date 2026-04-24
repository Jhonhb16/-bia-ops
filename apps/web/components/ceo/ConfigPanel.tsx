"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/Icon";

interface ServiceStatus {
  key: string;
  label: string;
  configured: boolean;
  status: "ok" | "error" | "unconfigured";
  message: string;
  costEstimate: string;
  category: "ia" | "infra" | "integracion";
}

interface ConfigData {
  services: ServiceStatus[];
  totalCost: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  infra: "Infraestructura",
  ia: "Inteligencia Artificial",
  integracion: "Integraciones"
};

const EDITABLE_KEYS = new Set([
  "CLAUDE_API_KEY", "GEMINI_API_KEY", "RESEND_API_KEY",
  "TELEGRAM_BOT_TOKEN", "META_APP_ID", "META_APP_SECRET"
]);

export function ConfigPanel() {
  const [data, setData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/config/status");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(key: string) {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: editValue })
      });
      const json = await res.json() as { ok: boolean; message?: string; error?: string };
      setSaveMsg(json.message ?? json.error ?? "");
      if (json.ok) {
        setEditing(null);
        setTimeout(() => { setSaveMsg(""); load(); }, 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card card-pad" id="config">
        <div className="label">Cargando estado del sistema...</div>
      </section>
    );
  }

  if (!data) return null;

  const categories = ["infra", "ia", "integracion"] as const;
  const okCount = data.services.filter((s) => s.status === "ok").length;

  return (
    <section id="config" className="grid" style={{ gap: 18 }}>
      <div className="card card-pad">
        <div className="section-title">
          <div>
            <div className="label">Configuracion del sistema</div>
            <h2>APIs y servicios conectados</h2>
          </div>
          <div className="avatar-row">
            <span className={`badge ${okCount === data.services.length ? "green" : okCount > data.services.length / 2 ? "purple" : "red"}`}>
              {okCount}/{data.services.length} activos
            </span>
            <span className="badge">~US$ {data.totalCost}/mes</span>
            <button className="icon-button" onClick={load} title="Recargar estado">
              <Icon name="refresh" size={16} />
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className="alert-card" style={{ marginBottom: 16, borderColor: saveMsg.includes("Error") ? "var(--red)" : "var(--green)" }}>
            <p className="small">{saveMsg}</p>
          </div>
        )}

        <div className="grid" style={{ gap: 24 }}>
          {categories.map((cat) => {
            const group = data.services.filter((s) => s.category === cat);
            if (!group.length) return null;
            return (
              <div key={cat}>
                <div className="eyebrow muted" style={{ marginBottom: 10 }}>{CATEGORY_LABELS[cat]}</div>
                <div className="grid" style={{ gap: 10 }}>
                  {group.map((svc) => (
                    <div key={svc.key} className="card card-pad" style={{ borderLeft: `3px solid ${svc.status === "ok" ? "var(--green)" : svc.status === "error" ? "var(--red)" : "var(--border)"}` }}>
                      <div className="split" style={{ alignItems: "flex-start" }}>
                        <div>
                          <div className="split" style={{ gap: 10, alignItems: "center" }}>
                            <strong style={{ fontSize: 13 }}>{svc.label}</strong>
                            <span className={`badge ${svc.status === "ok" ? "green" : svc.status === "error" ? "red" : ""}`} style={{ fontSize: 10 }}>
                              {svc.status === "ok" ? "OK" : svc.status === "error" ? "ERROR" : "Sin configurar"}
                            </span>
                          </div>
                          <p className="small" style={{ marginTop: 4, color: svc.status === "error" ? "var(--red)" : "var(--muted)" }}>
                            {svc.message}
                          </p>
                          <p className="small" style={{ marginTop: 2, opacity: 0.5 }}>{svc.costEstimate}</p>
                        </div>
                        {EDITABLE_KEYS.has(svc.key) && (
                          <button
                            className="icon-button"
                            title="Editar clave"
                            onClick={() => { setEditing(svc.key); setEditValue(""); setSaveMsg(""); }}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        )}
                      </div>

                      {editing === svc.key && (
                        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                          <p className="small" style={{ opacity: 0.6 }}>Nueva clave para <code>{svc.key}</code></p>
                          <input
                            className="input"
                            type="password"
                            placeholder="Pega la nueva API key aqui"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                          <div className="avatar-row" style={{ justifyContent: "flex-end" }}>
                            <button className="button secondary" type="button" onClick={() => setEditing(null)}>
                              Cancelar
                            </button>
                            <button
                              className="button"
                              type="button"
                              disabled={saving || !editValue.trim()}
                              onClick={() => save(svc.key)}
                            >
                              {saving ? "Guardando..." : "Guardar y reiniciar"}
                            </button>
                          </div>
                          <p className="small" style={{ opacity: 0.5 }}>
                            Al guardar el sistema se reinicia automaticamente (~10 seg de downtime).
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
