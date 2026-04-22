"use client";

import { useState } from "react";
import { Logo } from "./AppShell";

type RoleChoice = "ceo" | "expert" | "client";

const defaults = {
  ceo: "mario@biaagency.com",
  expert: "expert@biaagency.com",
  client: "fit-and-go"
};

export function LoginForm() {
  const [role, setRole] = useState<RoleChoice>("expert");
  const [email, setEmail] = useState(defaults.expert);
  const [password, setPassword] = useState("Bia2026!");
  const [token, setToken] = useState(defaults.client);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (role === "client") {
      window.location.href = `/acceso/${encodeURIComponent(token)}`;
      return;
    }

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

  function chooseRole(nextRole: RoleChoice) {
    setRole(nextRole);
    if (nextRole !== "client") setEmail(defaults[nextRole]);
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
              <div className="metric-value" style={{ fontSize: 30 }}>
                50+
              </div>
            </div>
            <div className="card card-pad">
              <div className="label">Canales</div>
              <div className="metric-value" style={{ fontSize: 30 }}>
                3
              </div>
            </div>
            <div className="card card-pad">
              <div className="label">Alertas</div>
              <div className="metric-value" style={{ fontSize: 30 }}>
                24/7
              </div>
            </div>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow muted">Acceso separado por rol</div>
          <h2 className="display-title" style={{ fontSize: 34, margin: "10px 0 8px" }}>
            Entrar a BIA OPS
          </h2>
          <p className="muted">Usa las credenciales demo para probar local. En produccion esto queda conectado a Supabase Auth.</p>

          <div className="role-grid">
            <button className={`role-option ${role === "ceo" ? "active" : ""}`} type="button" onClick={() => chooseRole("ceo")}>
              <span className="material-symbols-outlined">query_stats</span>
              <strong style={{ display: "block", marginTop: 8 }}>CEO</strong>
              <span className="small">Solo lectura</span>
            </button>
            <button className={`role-option ${role === "expert" ? "active" : ""}`} type="button" onClick={() => chooseRole("expert")}>
              <span className="material-symbols-outlined">fact_check</span>
              <strong style={{ display: "block", marginTop: 8 }}>Experto</strong>
              <span className="small">Operacion diaria</span>
            </button>
            <button className={`role-option ${role === "client" ? "active" : ""}`} type="button" onClick={() => chooseRole("client")}>
              <span className="material-symbols-outlined">account_circle</span>
              <strong style={{ display: "block", marginTop: 8 }}>Cliente</strong>
              <span className="small">Magic link</span>
            </button>
          </div>

          {role === "client" ? (
            <label className="grid" style={{ gap: 8 }}>
              <span className="label">Token de acceso</span>
              <input className="input" value={token} onChange={(event) => setToken(event.target.value)} />
            </label>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              <label className="grid" style={{ gap: 8 }}>
                <span className="label">Email</span>
                <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="grid" style={{ gap: 8 }}>
                <span className="label">Password demo</span>
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            </div>
          )}

          {error ? <p className="badge red" style={{ marginTop: 16 }}>{error}</p> : null}

          <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 18 }}>
            <span className="material-symbols-outlined">login</span>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="card card-pad" style={{ marginTop: 18 }}>
            <div className="label">Credenciales locales</div>
            <p className="small" style={{ lineHeight: 1.7 }}>
              CEO: mario@biaagency.com · Experto: expert@biaagency.com · Password: Bia2026! · Cliente: fit-and-go
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
