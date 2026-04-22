"use client";

import { useState } from "react";
import { Logo } from "@/components/shared/AppShell";

export default function AccesoClientePage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = token.trim();
    if (!clean) { setError("Ingresa tu codigo de acceso."); return; }
    setLoading(true);
    window.location.href = `/acceso/${encodeURIComponent(clean)}`;
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg, #080808)", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <Logo />
        </div>

        <div className="card card-pad" style={{ padding: "36px 32px" }}>
          <div className="eyebrow muted" style={{ marginBottom: 8 }}>Portal de clientes</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Accede a tu dashboard</h1>
          <p className="muted small" style={{ marginBottom: 24, lineHeight: 1.6 }}>
            Ingresa el codigo personal que recibiste al completar tu onboarding.
          </p>

          <form onSubmit={submit} className="grid" style={{ gap: 14 }}>
            <label className="grid" style={{ gap: 8 }}>
              <span className="label">Codigo de acceso</span>
              <input
                className="input"
                type="text"
                placeholder="bia-xxxxxxxx-xxxx"
                autoComplete="off"
                autoFocus
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(""); }}
              />
            </label>

            {error && <p className="badge red">{error}</p>}

            <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
              <span className="material-symbols-outlined">lock_open</span>
              {loading ? "Verificando..." : "Entrar a mi dashboard"}
            </button>
          </form>

          <p className="small muted" style={{ marginTop: 20, textAlign: "center" }}>
            ¿No tienes tu codigo? Contacta a tu gestor por WhatsApp.
          </p>
        </div>
      </div>
    </main>
  );
}
