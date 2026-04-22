"use client";

import { useState } from "react";
import { Logo } from "./AppShell";

type RoleChoice = "ceo" | "expert";

export function LoginForm() {
  const [role, setRole] = useState<RoleChoice>("expert");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email, password })
    });

    const data = (await response.json()) as { ok: boolean; redirectTo?: string; error?: string };
    setLoading(false);

    if (!response.ok || !data.ok || !data.redirectTo) {
      setError(data.error ?? "No pudimos iniciar sesion.");
      return;
    }

    window.location.href = data.redirectTo;
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <Logo />
          <div>
            <div className="eyebrow muted">Bia Agency</div>
            <h1 className="page-title" style={{ marginTop: 12 }}>
              Operacion paga, clara y bajo control.
            </h1>
            <p className="muted" style={{ maxWidth: 430, lineHeight: 1.6 }}>
              Panel operativo para alertas, clientes, reportes, comisiones y seguimiento de campanas de performance.
            </p>
          </div>
          <div className="grid three-col">
            <div className="card card-pad">
              <div className="label">Clientes</div>
              <div className="metric-value" style={{ fontSize: 30 }}>50+</div>
            </div>
            <div className="card card-pad">
              <div className="label">Canales</div>
              <div className="metric-value" style={{ fontSize: 30 }}>3</div>
            </div>
            <div className="card card-pad">
              <div className="label">Alertas</div>
              <div className="metric-value" style={{ fontSize: 30 }}>24/7</div>
            </div>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow muted">Acceso interno</div>
          <h2 className="display-title" style={{ fontSize: 34, margin: "10px 0 8px" }}>
            Entrar a BIA OPS
          </h2>
          <p className="muted">Acceso exclusivo para el equipo de Bia Agency.</p>

          <div className="role-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className={`role-option ${role === "ceo" ? "active" : ""}`} type="button" onClick={() => setRole("ceo")}>
              <span className="material-symbols-outlined">query_stats</span>
              <strong style={{ display: "block", marginTop: 8 }}>CEO</strong>
              <span className="small">Solo lectura</span>
            </button>
            <button className={`role-option ${role === "expert" ? "active" : ""}`} type="button" onClick={() => setRole("expert")}>
              <span className="material-symbols-outlined">fact_check</span>
              <strong style={{ display: "block", marginTop: 8 }}>Experto</strong>
              <span className="small">Operacion diaria</span>
            </button>
          </div>

          <div className="grid" style={{ gap: 12 }}>
            <label className="grid" style={{ gap: 8 }}>
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid" style={{ gap: 8 }}>
              <span className="label">Contrasena</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>

          {error ? <p className="badge red" style={{ marginTop: 16 }}>{error}</p> : null}

          <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 18 }}>
            <span className="material-symbols-outlined">login</span>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="small muted" style={{ marginTop: 16, textAlign: "center" }}>
            ¿Eres cliente? Usa el link personal que te enviamos.
          </p>
        </form>
      </section>
    </main>
  );
}
